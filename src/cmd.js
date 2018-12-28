const fs = require("fs");
const globby = require("globby");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const chalk = require("chalk");

class Counter {
  constructor() {
    this._componentCounts = new Map();
    this._propCounts = new Map();
  }

  incrementComponentUsage(component) {
    const prev = this._componentCounts.get(component) || 0;
    if (!prev) {
      this._propCounts.set(component, new Map());
    }
    this._componentCounts.set(component, prev + 1);
  }

  incrementComponentPropUsage(component, prop) {
    const map = this._propCounts.get(component);
    const prev = map.get(prop) || 0;
    map.set(prop, prev + 1);
  }

  getComponentsList() {
    return this.getSortedMap(this._componentCounts).map(x => x.name);
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
    if (!component) {
      throw new Error();
    }
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

function safeParse(filename) {
  try {
    return parse(fs.readFileSync(filename, "utf8"), {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      plugins: [
        filename.endsWith(".tsx") ? "typescript" : "flow",
        "jsx",
        "dynamicImport",
        "classProperties",
        "objectRestSpread"
      ]
    });
  } catch (error) {
    console.log(error);
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function updateUsageFromFile({ componentsSet, counter, filename }) {
  const ast = safeParse(filename);
  if (!ast) {
    console.error(`failed to parse ${filename}`);
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

function getUsage({ componentsSet, counter, options }) {
  const filenames = globby.sync(options.files, {
    cwd: options.directory || process.cwd(),
    gitignore: options.gitignore,
    absolute: true,
    onlyFiles: true
  });
  for (const filename of filenames) {
    updateUsageFromFile({ componentsSet, counter, filename });
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

function cmd(components, options) {
  const componentsSet = new Set(components);
  const counter = new Counter();
  getUsage({ componentsSet, counter, options });
  for (const comp of counter.getComponentsList()) {
    printReport(comp, counter.getComponentReport(comp));
  }
}

function printHeading(...args) {
  console.log();
  console.log(chalk.cyan(...args));
}

function printReport(component, report) {
  const { componentCount, propCounts } = report;
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
    console.log(
      [
        "",
        chalk.bold(count.toString().padStart(maxLen)),
        textMeter(count, componentCount),
        name
      ].join("  ")
    );
  }
}

exports.default = cmd;
