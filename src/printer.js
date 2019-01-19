const chalk = require("chalk");
const progressLogger = require("log-update").create(process.stderr, {
  showCursor: true
});

// eslint-disable-next-line no-console
const print = console.log.bind(console);

class Spinner {
  constructor() {
    this.time = Date.now();
    this.frames = ["   ", ".  ", ".. ", "..."];
    this.index = 0;
    this.speed = 350;
  }

  toString() {
    const time = Date.now();
    const dt = time - this.time;
    if (dt > this.speed) {
      this.time = time;
      this.index = (this.index + 1) % this.frames.length;
    }
    return this.frames[this.index];
  }
}

const spinner = new Spinner();

function textMeter(count, total) {
  const CHAR_BOX_FULL = chalk.bold.green("*");
  const CHAR_BOX_LIGHT = chalk.bold.red("-");
  const size = 10;
  let str = "";
  let first = Math.ceil((count / total) * size);
  let rest = size - first;
  while (first-- > 0) {
    str += CHAR_BOX_FULL;
  }
  while (rest-- > 0) {
    str += CHAR_BOX_LIGHT;
  }
  return str;
}

function printProblemsReport(counter) {
  const { errors, suggestedPlugins } = counter.getProblems();
  const n = errors.length;
  if (n > 0) {
    printHeading(`${n} parse ${n === 1 ? "error" : "errors"}:`);
    for (const { filename, error } of errors) {
      const { line, column } = error.loc;
      const message = chalk.bold.red(error.message);
      print(`  ${filename}:${line}:${column}: ${message}`);
    }
  }
  if (suggestedPlugins.length > 0) {
    printHeading("Try adding at least one of the following options:");
    for (const plugin of suggestedPlugins) {
      print("  --add-babel-plugin", plugin);
    }
  }
}

function printComponentsReport(counter) {
  const { total, counts } = counter.getAllComponentsReport();
  const comps = counter.getComponentsList();
  const s = `${comps.length} ${
    comps.length === 1 ? "component" : "components"
  } used ${total} ${total === 1 ? "time" : "times"}`;
  if (counts.length === 0) {
    printHeading(s);
    return;
  }
  printHeading(`${s}:`);
  const maxLen = counts[0].count.toString().length;
  for (const { name, count } of counts) {
    print(
      [
        "",
        chalk.bold(count.toString().padStart(maxLen)),
        textMeter(count, total),
        name
      ].join("  ")
    );
  }
}

function printHeading(...args) {
  print();
  print(chalk.cyan(...args));
}

function printComponentPropsReport(counter, component) {
  const { componentCount, propCounts } = counter.getComponentReport(component);
  const word = componentCount === 1 ? "time" : "times";
  const compName = chalk.bold(`<${component}>`);
  const first = `${compName} was used ${componentCount} ${word}`;
  if (propCounts.length === 0) {
    printHeading(first, "without any props");
    return;
  }
  printHeading(first, "with the following prop usage:");
  const maxLen = propCounts[0].count.toString().length;
  for (const { name, count } of propCounts) {
    print(
      [
        "",
        chalk.bold(count.toString().padStart(maxLen)),
        textMeter(count, componentCount),
        name
      ].join("  ")
    );
  }
}

function printChildrenUsage(counter) {
  const allComponents = counter.getComponentChildrenUsageList();
  print(chalk`\n{yellow children usage:}\n`);
  const componentsUsingChildren = allComponents.filter(
    componentChildsCount => componentChildsCount[1].size > 0
  );
  for (const [name, children] of componentsUsingChildren) {
    print(chalk`{cyan.bold <${name}> used:}`);
    const total = [...children].reduce((acc, child) => acc + child[1], 0);

    for (const [child, count] of children) {
      print(
        chalk`  {bold ${count}} ${textMeter(count, total)} {bold <${child}}>`
      );
    }
  }

  const componentsNotUsingChildren = allComponents.filter(
    componentChildsCount => componentChildsCount[1].size === 0
  );
  if (componentsNotUsingChildren.length > 0) {
    print(chalk`\n{cyan.bold following components used no children}`);
    for (const [name] of componentsNotUsingChildren) {
      print(chalk` {bold <${name}>}`);
    }
  }
}

function printProgress() {
  const message = chalk.cyan(chalk.bold(spinner), "Finding files");
  progressLogger(`\n${message}\n`);
}

function clearProgress() {
  progressLogger.clear();
}

function printScanningFile(filename) {
  const message = chalk.cyan(chalk.bold(spinner), "Scanning files");
  progressLogger(`\n${message}\n\n${filename}\n`);
}

module.exports = {
  print,
  printChildrenUsage,
  printComponentPropsReport,
  printComponentsReport,
  printProblemsReport,
  printProgress,
  printScanningFile,
  clearProgress
};
