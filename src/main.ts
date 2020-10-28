import { Analysis, analyze } from "./api";
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

export async function main() {
  if (!cli.prop && cli.report.includes("lines")) {
    throw new Error("`--prop` argument required for `lines` report");
  }
  const results = await analyze({
    babelPlugins: cli.babelPlugins,
    components: cli.components,
    directory: cli.directory,
    files: cli.files,
    gitignore: cli.gitignore,
    ignore: cli.ignore,
    prop: cli.prop,
    report: cli.report,
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
  reportTime(results);
  if (cli.report.includes("usage")) {
    reportComponentUsage(results);
  }
  if (cli.report.includes("props")) {
    reportPropUsage(results);
  }
  if (cli.report.includes("lines")) {
    reportLinesUsage(results);
  }
  reportErrors(results);
  spinner.stop();
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
  for (const [componentName, count] of Object.entries(pairs)) {
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
  return Math.max(...[...iterable].map((n) => n.toString().length));
}

function reportPropUsage({ propUsage, componentUsage }: Analysis) {
  const propUsageByComponent = propUsage;
  for (const [componentName, propUsage] of Object.entries(
    propUsageByComponent
  )) {
    const compUsage = componentUsage[componentName];
    print(
      styleHeading(
        `${styleComponentName(componentName)} was used ${compUsage} ${
          compUsage === 1 ? "time" : "times"
        } with the following prop usage:`
      )
    );
    const maxDigits = getMaxDigits(Object.values(propUsage));
    for (const [propName, usage] of Object.entries(propUsage)) {
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
