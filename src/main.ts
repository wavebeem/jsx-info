import { prompt } from "inquirer";
import { Analysis, analyze, ReportType } from "./api";
import { assertNever } from "./assertNever";
import * as cli from "./cli";
import {
  print,
  spinner,
  styleComponentName,
  styleError,
  styleHeading,
  styleNumber,
  stylePropName,
  textMeter,
} from "./printer";
import { sleep } from "./sleep";

function sortByDesc<A, B>(array: A[], fn: (item: A) => B): A[] {
  return [...array].sort((a, b) => {
    const xa = fn(a);
    const xb = fn(b);
    if (xa < xb) {
      return 1;
    } else if (xa > xb) {
      return 1;
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

interface Answers {
  components?: string[];
  report?: ReportType;
  prop?: string;
}

export async function main(): Promise<void> {
  const answers = await prompt<Answers>([
    {
      type: "input",
      name: "components",
      when: cli.components.length === 0,
      filter(input: string) {
        input = input.trim();
        if (input === "") {
          return [];
        }
        return input.split(/\s+/);
      },
      message: "Which components (space separated, leave empty to scan all)",
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
        return report === "lines" || cli.report === "lines";
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
  const cliComponents =
    cli.components.length === 1 && cli.components[0] === "*"
      ? []
      : cli.components;
  const components: string[] = answers.components || cliComponents;
  const prop: string = answers.prop || cli.prop;
  const report: ReportType = answers.report || cli.report || "usage";
  const files: string[] = fallbackArray(cli.files, ["**/*.{js,jsx,tsx}"]);
  const results = await analyze({
    components,
    files,
    prop,
    report,
    babelPlugins: cli.babelPlugins,
    directory: cli.directory,
    gitignore: cli.gitignore,
    ignore: cli.ignore,
    async onFile(filename) {
      if (cli.showProgress) {
        spinner.text = `Scanning files\n\n${filename}`;
        // We need to sleep briefly here since parse isn't asnyc and the `ora`
        // spinner library assumes the event loop will be ticking periodically
        await sleep();
      }
    },
    async onStart() {
      if (cli.showProgress) {
        spinner.text = "Finding files";
        spinner.start();
      }
    },
  });
  spinner.stop();
  print();
  reportTime(results);
  if (report === "usage") {
    reportComponentUsage(results);
  } else if (report === "props") {
    reportPropUsage(results);
  } else if (report === "lines") {
    reportLinesUsage(results);
  } else {
    assertNever(report);
  }
  reportErrors(results);
}

function reportTime({ filenames, elapsedTime }: Analysis) {
  print(
    `Scanned ${filenames.length} files in ${elapsedTime.toFixed(1)} seconds`
  );
}

function reportComponentUsage({
  componentTotal,
  componentUsageTotal,
  componentUsage,
}: Analysis) {
  if (componentTotal === 0) {
    return;
  }
  const pairs = componentUsage;
  const maxDigits = getMaxDigits(Object.values(pairs));
  print(
    styleHeading(
      `${componentTotal} components used ${componentUsageTotal} times:`
    )
  );
  const sortedUsage = sortByDesc(Object.entries(pairs), ([, count]) => count);
  for (const [componentName, count] of sortedUsage) {
    print(
      "  " + styleNumber(count.toString().padStart(maxDigits)),
      "  " + textMeter(componentUsageTotal, count),
      "  " + styleComponentName(componentName)
    );
  }
}

function reportLinesUsage({ lineUsage }: Analysis) {
  for (const [componentName, props] of Object.entries(lineUsage)) {
    for (const data of Object.values(props)) {
      for (const lineData of data) {
        const { filename, startLoc, prettyCode } = lineData;
        const { line, column } = startLoc;
        const styledComponentName = styleComponentName(componentName);
        print(
          styleHeading(`${styledComponentName} ${filename}:${line}:${column}`)
        );
        print(prettyCode);
      }
    }
  }
}

function getMaxDigits(iterable: Iterable<number>): number {
  // Pad to at least 4 digits so that most things line up
  return Math.max(4, ...[...iterable].map((n) => n.toString().length));
}

function reportPropUsage({ propUsage, componentUsage }: Analysis) {
  const propUsageByComponent = sortByDesc(
    Object.entries(propUsage),
    ([name]) => componentUsage[name]
  );
  for (const [componentName, propUsage] of propUsageByComponent) {
    const compUsage = componentUsage[componentName];
    print(
      styleHeading(
        `${styleComponentName(componentName)} was used ${compUsage} ${
          compUsage === 1 ? "time" : "times"
        } with the following prop usage:`
      )
    );
    const maxDigits = getMaxDigits(Object.values(propUsage));
    const sortedUsage = sortByDesc(
      Object.entries(propUsage),
      ([, count]) => count
    );
    for (const [propName, usage] of sortedUsage) {
      print(
        "  " + styleNumber(usage.toString().padStart(maxDigits)),
        "  " + textMeter(compUsage, usage),
        "  " + stylePropName(propName)
      );
    }
  }
  print(`
Tip: Want to see where the className prop was used on the <div> component?

npx jsx-info --report lines --prop className div
`);
}

function reportErrors({ errors, suggestedPlugins }: Analysis) {
  const errorsCount = Object.keys(errors).length;
  if (errorsCount) {
    print("\n" + errorsCount, "parse", errorsCount === 1 ? "error" : "errors");
    for (const [filename, error] of Object.entries(errors)) {
      const { loc, message } = error;
      const { line, column } = loc;
      print(`  ${filename}:${line}:${column}`, styleError(message));
    }
    if (suggestedPlugins.length > 0) {
      print("Try adding at least one of the following options:");
      for (const plugin of suggestedPlugins) {
        print("  --add-babel-plugin", plugin);
      }
    }
  }
}
