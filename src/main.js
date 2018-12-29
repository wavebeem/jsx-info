const fs = require("fs");
const globby = require("globby");
const program = require("commander");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const chalk = require("chalk");
const progressLogger = require("log-update").create(process.stderr, {
  showCursor: true
});

// eslint-disable-next-line no-console
const print = console.log.bind(console);

class Counter {
  constructor() {
    this._allComponentsCount = 0;
    this._componentCounts = new Map();
    this._propCounts = new Map();
    this._errors = [];
    this._suggestedPlugins = new Set();
  }

  addParseError({ filename, error }) {
    this._errors.push({ filename, error });
    for (const plugin of error.missingPlugin || []) {
      this._suggestedPlugins.add(plugin);
    }
  }

  incrementComponentUsage(component) {
    const prev = this._componentCounts.get(component) || 0;
    if (!prev) {
      this._propCounts.set(component, new Map());
    }
    this._allComponentsCount++;
    this._componentCounts.set(component, prev + 1);
  }

  incrementComponentPropUsage(component, prop) {
    const map = this._propCounts.get(component);
    const prev = map.get(prop) || 0;
    map.set(prop, prev + 1);
  }

  getProblems() {
    return {
      errors: [...this._errors],
      suggestedPlugins: [...this._suggestedPlugins]
    };
  }

  getComponentsList() {
    return this.getSortedMap(this._componentCounts).map(x => x.name);
  }

  getAllComponentsReport() {
    const total = this._allComponentsCount;
    const counts = this.getSortedMap(this._componentCounts);
    return { total, counts };
  }

  getSortedMap(map) {
    return [...map]
      .map(([name, count]) => {
        return { name, count };
      })
      .sort((a, b) => {
        if (b.count < a.count) {
          return -1;
        }
        if (b.count > a.count) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }

  getComponentReport(component) {
    const componentCount = this._componentCounts.get(component);
    const propCounts = this.getSortedMap(this._propCounts.get(component));
    return { componentCount, propCounts };
  }
}

const SPREAD_ATTRIBUTE_NAME = "{...}";

function getDottedName(node) {
  switch (node.type) {
    case "JSXMemberExpression":
      return [node.object, node.property].map(getDottedName).join(".");
    case "JSXIdentifier":
      return node.name;
    default:
      throw new Error(`unexpected node type: ${node.type}`);
  }
}

function getPropName(node) {
  switch (node.type) {
    case "JSXAttribute":
      return node.name.name;
    case "JSXSpreadAttribute":
      return SPREAD_ATTRIBUTE_NAME;
    default:
      throw new Error(`unexpected node type: ${node.type}`);
  }
}

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

function safeParse({ filename, counter, babelPlugins, progress }) {
  try {
    if (progress) {
      const message = chalk.cyan(chalk.bold(spinner), "Scanning files");
      progressLogger(`\n${message}\n\n${filename}\n`);
    }
    return parse(fs.readFileSync(filename, "utf8"), {
      sourceFilename: filename,
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      plugins: [
        filename.endsWith(".tsx") ? "typescript" : "flow",
        "jsx",
        "dynamicImport",
        "classProperties",
        "objectRestSpread",
        ...babelPlugins
      ]
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      counter.addParseError({ filename, error });
      return null;
    }
    throw error;
  }
}

function updateUsageFromFile({
  componentsSet,
  counter,
  filename,
  babelPlugins,
  progress
}) {
  const ast = safeParse({ filename, counter, babelPlugins, progress });
  if (!ast) {
    return;
  }
  traverse(ast, {
    enter(path) {
      if (path.type !== "JSXOpeningElement") {
        return;
      }
      const name = getDottedName(path.node.name);
      if (componentsSet.size > 0 && !componentsSet.has(name)) {
        return;
      }
      counter.incrementComponentUsage(name);
      if (path.parent.children.length > 0) {
        counter.incrementComponentPropUsage(name, "children");
      }
      for (const prop of path.node.attributes) {
        counter.incrementComponentPropUsage(name, getPropName(prop));
      }
    }
  });
}

function getUsage({ componentsSet, counter }) {
  if (program.progress) {
    const message = chalk.cyan(chalk.bold(spinner), "Finding files");
    progressLogger(`\n${message}\n`);
  }
  const filenames = globby.sync(program.files, {
    cwd: program.directory || process.cwd(),
    gitignore: program.gitignore,
    absolute: true,
    onlyFiles: true
  });
  const progress = program.progress;
  const babelPlugins = program.addBabelPlugin;
  for (const filename of filenames) {
    updateUsageFromFile({
      componentsSet,
      counter,
      filename,
      babelPlugins,
      progress
    });
  }
}

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

function printReport(counter, component) {
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

function main() {
  const componentsSet = new Set(program.args);
  const counter = new Counter();
  getUsage({ componentsSet, counter });
  if (program.progress) {
    progressLogger.clear();
  }
  printProblemsReport(counter);
  printComponentsReport(counter);
  for (const comp of counter.getComponentsList()) {
    printReport(counter, comp);
  }
}

exports.default = main;
