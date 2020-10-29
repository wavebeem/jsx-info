import chalk from "chalk";
import { spawn } from "child_process";
import { prompt } from "inquirer";
import { Writable } from "stream";
import { Analysis, analyze } from "./api";
import { assertNever } from "./assertNever";
import * as cli from "./cli";
import { print, spinner, textMeter } from "./printer";
import { sleep } from "./sleep";

interface Answers {
  components?: string[];
  report?: cli.ReportType;
  prop?: string;
}

function sortByDesc<A, B>(array: A[], fn: (item: A) => B): A[] {
  return [...array].sort((a, b) => {
    const xa = fn(a);
    const xb = fn(b);
    if (xa < xb) {
      return 1;
    } else if (xa > xb) {
      return -1;
    } else {
      return 0;
    }
  });
}

function fallbackArray<T>(array: T[], fallback: T[]): T[] {
  if (array.length === 0) {
    return fallback;
  }
  return array;
}

function getPagerStream(): Writable {
  const pager =
    process.platform === "win32"
      ? spawn("more", { stdio: ["pipe", "inherit", "inherit"] })
      : spawn("less", ["-R"], { stdio: ["pipe", "inherit", "inherit"] });
  if (pager.stdin) {
    // I don't care if the user quits their pager before we've written all our
    // output! Just silently ignore so the program can finish.
    pager.stdin.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "EPIPE") {
        throw err;
      }
    });
    return pager.stdin;
  }
  return process.stdout;
}

export async function main(): Promise<void> {
  // Validate the `--report` command line option
  if (cli.report && !["usage", "props", "lines"].includes(cli.report)) {
    throw new Error(
      `jsx-info: invalid report: ${cli.report} (expected: usage | props | lines)`
    );
  }
  // Interactively ask the user for any missing command line flags that are
  // required
  const answers = await prompt<Answers>([
    {
      type: "input",
      name: "components",
      when: !cli.components,
      default: "*",
      filter(input: string) {
        input = input.trim();
        if (input === "") {
          return ["*"];
        }
        return input.split(/\s+/);
      },
      message: "Which components (space separated, * = all) [--components]",
    },
    {
      type: "list",
      name: "report",
      when: !cli.report,
      message: "Which report [--report]",
      choices: [
        { value: "usage", name: "Total component usage [usage]" },
        { value: "props", name: "Total props usage [props]" },
        {
          value: "lines",
          name: "Show lines where certain props are used [lines]",
        },
      ],
    },
    {
      type: "input",
      name: "prop",
      when({ report }) {
        return (report === "lines" || cli.report === "lines") && !cli.prop;
      },
      validate(input: string) {
        return input.trim() !== "";
      },
      filter(input: string) {
        return input.trim();
      },
      message: "Which prop (e.g. `id` or `variant=primary`) [--prop]",
    },
  ]);
  if (Object.keys(answers).length > 0) {
    print();
  }
  // The internal representation for "all components" is different than how you
  // actually pass it in via the command line, since it's weird to pass an
  // "empty array" as a command line flag.
  const components: string[] = ((comp) => {
    if (comp && comp.length == 1 && comp[0] == "*") {
      return [];
    }
    return comp;
  })(answers.components || cli.components);
  // Merge the command line flags with the interactive questions that were
  // asked, and fall back to default values.
  const prop: string = answers.prop || cli.prop;
  const report: cli.ReportType = answers.report || cli.report || "usage";
  const files: string[] = fallbackArray(cli.files, ["**/*.{js,jsx,tsx}"]);
  // Start the spinner. Sometimes the "finding files" step can take a long time
  // if you accidentally scan the node_modules folder. This way you can tell
  // what's wrong instead of just seeing the program hang.
  if (cli.showProgress) {
    spinner.text = "Finding files";
    spinner.start();
  }
  // Start the analysis
  const results = await analyze({
    components,
    files,
    prop,
    babelPlugins: cli.babelPlugins,
    directory: cli.directory,
    gitignore: cli.gitignore,
    ignore: cli.ignore,
    // Update the loading spinner with the current filename, and `sleep` so that
    // the loading spinner actually gets a chance to run, instead of us chewing
    // all the CPU time.
    async onFile(filename) {
      if (cli.showProgress) {
        spinner.text = `Scanning files\n\n${filename}`;
        await sleep();
      }
    },
  });
  // Stop the spinner now that the analysis is done
  spinner.stop();
  // There doesn't seem to be any good way to output color codes into a pager in
  // Windows, so let's briefly disable color output from chalk.
  const oldChalkLevel = chalk.level;
  if (process.platform === "win32") {
    chalk.level = 0;
  }
  // Create a stream that writes to a pager (`less -R` unless you're on Windows,
  // then it's `more`).
  const stream = getPagerStream();
  // Log how long the command took
  reportTime(stream, results);
  // Report whatever the user was interested in
  if (report === "usage") {
    reportComponentUsage(stream, results);
  } else if (report === "props") {
    reportPropUsage(stream, results);
  } else if (report === "lines") {
    reportLinesUsage(stream, results);
  } else {
    assertNever(report);
  }
  // Report what errors happened so the user can fix parse errors
  reportErrors(stream, results);
  // End the stream so that the pager knows the input is finished
  stream.end();
  // Restore the old chalk color level
  chalk.level = oldChalkLevel;
}

function reportTime(stream: Writable, { filenames, elapsedTime }: Analysis) {
  stream.write(
    `Scanned ${filenames.length} files in ${elapsedTime.toFixed(1)} seconds\n`
  );
}

function reportComponentUsage(
  stream: Writable,
  { componentTotal, componentUsageTotal, componentUsage }: Analysis
) {
  if (componentTotal === 0) {
    return;
  }
  const pairs = componentUsage;
  const maxDigits = getMaxDigits(Object.values(pairs));
  stream.write(
    chalk.cyan`\n${componentTotal} components used ${componentUsageTotal} times:\n`
  );
  const sortedUsage = sortByDesc(Object.entries(pairs), ([, count]) => count);
  for (const [componentName, count] of sortedUsage) {
    stream.write(
      [
        "  " + chalk.bold(count.toString().padStart(maxDigits)),
        "  " + textMeter(componentUsageTotal, count),
        "  " + chalk.bold(`<${componentName}>`) + "\n",
      ].join("")
    );
  }
}

function reportLinesUsage(stream: Writable, { lineUsage }: Analysis) {
  for (const [componentName, props] of Object.entries(lineUsage)) {
    for (const data of Object.values(props)) {
      for (const lineData of data) {
        const { filename, startLoc, prettyCode } = lineData;
        const { line, column } = startLoc;
        const styledComponentName = chalk.bold(`<${componentName}>`);
        stream.write(
          chalk.cyan`\n${styledComponentName} ${filename}:${line}:${column}\n`
        );
        stream.write(prettyCode);
        stream.write("\n");
      }
    }
  }
}

function getMaxDigits(iterable: Iterable<number>): number {
  // Pad to at least 4 digits so that most things line up
  return Math.max(4, ...[...iterable].map((n) => n.toString().length));
}

function reportPropUsage(
  stream: Writable,
  { propUsage, componentUsage }: Analysis
) {
  const propUsageByComponent = sortByDesc(
    Object.entries(propUsage),
    ([name]) => componentUsage[name]
  );
  for (const [componentName, propUsage] of propUsageByComponent) {
    const compUsage = componentUsage[componentName];
    stream.write(
      `\n${chalk.bold(`<${componentName}>`)} was used ${compUsage} ${
        compUsage === 1 ? "time" : "times"
      } with the following prop usage:\n`
    );
    const maxDigits = getMaxDigits(Object.values(propUsage));
    const sortedUsage = sortByDesc(
      Object.entries(propUsage),
      ([, count]) => count
    );
    for (const [propName, usage] of sortedUsage) {
      stream.write(
        [
          "  " + chalk.bold(usage.toString().padStart(maxDigits)),
          "  " + textMeter(compUsage, usage),
          "  " + chalk.bold(propName),
          "\n",
        ].join("")
      );
    }
  }
}

function reportErrors(
  stream: Writable,
  { errors, suggestedPlugins }: Analysis
) {
  const errorsCount = Object.keys(errors).length;
  if (errorsCount) {
    stream.write(
      "\n" + errorsCount + " parse " + (errorsCount === 1 ? "error" : "errors")
    );
    for (const [filename, error] of Object.entries(errors)) {
      const { loc, message } = error;
      const { line, column } = loc;
      stream.write(
        `  ${filename}:${line}:${column}` + chalk.bold.red(message) + "\n"
      );
    }
    if (suggestedPlugins.length > 0) {
      stream.write("\nTry adding these Babel plugins as arguments:\n");
      stream.write(
        chalk.bold.cyan("    --babel-plugins") +
          " " +
          suggestedPlugins.map((s) => chalk.underline.magenta(s)).join(" ") +
          "\n"
      );
    }
  }
}
