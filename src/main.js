const cli = require("./cli");
const printer = require("./printer");
const { analyze } = require("./api");
const { sleep } = require("./sleep");

async function main() {
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
    sort: cli.sort,
    async onFile(filename) {
      if (cli.showProgress) {
        printer.spinner.text = `Scanning files\n\n${filename}`;
        // We need to sleep briefly here since parse isn't asnyc and the `ora`
        // spinner library assumes the event loop will be ticking periodically
        await sleep();
      }
    },
    async onStart() {
      if (cli.showProgress) {
        printer.spinner.text = "Finding files";
        printer.spinner.start();
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
  printer.spinner.stop();
}

function reportTime({ filenames, elapsedTime }) {
  printer.print(
    `Scanned ${filenames.length} files in ${elapsedTime.toFixed(1)} seconds`
  );
}

function reportComponentUsage({ totals, componentUsage }) {
  const { componentTotal, componentUsageTotal } = totals;
  if (componentTotal === 0) {
    return;
  }
  const pairs = componentUsage;
  const maxDigits = getMaxDigits(Object.values(pairs));
  printer.print(
    printer.styleHeading(
      `${componentTotal} components used ${componentUsageTotal} times:`
    )
  );
  for (const [componentName, count] of Object.entries(pairs)) {
    printer.print(
      "  " + printer.styleNumber(count.toString().padStart(maxDigits)),
      "  " + printer.textMeter(componentUsageTotal, count),
      "  " + printer.styleComponentName(componentName)
    );
  }
}

function reportLinesUsage({ lineUsage }) {
  // TODO: Does it make sense to sort the output here somehow?
  for (const [componentName, props] of Object.entries(lineUsage)) {
    for (const data of Object.values(props)) {
      for (const lineData of data.lines) {
        const { filename, startLoc, prettyCode } = lineData;
        const { line, column } = startLoc;
        const styledComponentName = printer.styleComponentName(componentName);
        printer.print(
          printer.styleHeading(
            `${styledComponentName} ${filename}:${line}:${column}`
          )
        );
        printer.print(prettyCode);
      }
    }
  }
}

function getMaxDigits(iterable) {
  return Math.max(...[...iterable].map((n) => n.toString().length));
}

function reportPropUsage({ propUsage, componentUsage }) {
  const propUsageByComponent = propUsage;
  for (const [componentName, propUsage] of Object.entries(
    propUsageByComponent
  )) {
    const compUsage = componentUsage[componentName];
    printer.print(
      printer.styleHeading(
        `${printer.styleComponentName(componentName)} was used ${compUsage} ${
          compUsage === 1 ? "time" : "times"
        } with the following prop usage:`
      )
    );
    const maxDigits = getMaxDigits(Object.values(propUsage));
    for (const [propName, usage] of Object.entries(propUsage)) {
      printer.print(
        "  " + printer.styleNumber(usage.toString().padStart(maxDigits)),
        "  " + printer.textMeter(compUsage, usage),
        "  " + printer.stylePropName(propName)
      );
    }
  }
  printer.print(`
Tip: Want to see where the className prop was used on the <div> component?

npx jsx-info --report lines --prop className div
`);
}

function reportErrors({ errors, suggestedPlugins }) {
  const errorsCount = Object.keys(errors).length;
  if (errorsCount) {
    printer.print(
      "\n" + errorsCount,
      "parse",
      errorsCount === 1 ? "error" : "errors"
    );
    for (const [filename, error] of Object.entries(errors)) {
      const { loc, message } = error;
      const { line, column } = loc;
      printer.print(
        `  ${filename}:${line}:${column}`,
        printer.styleError(message)
      );
    }
    if (suggestedPlugins.size) {
      printer.print("Try adding at least one of the following options:");
      for (const plugin of suggestedPlugins) {
        printer.print("  --add-babel-plugin", plugin);
      }
    }
  }
}

exports.main = main;
