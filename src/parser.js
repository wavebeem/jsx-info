const fs = require("fs");
const globby = require("globby");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const Counter = require("./Counter");

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

const SPREAD_ATTRIBUTE_NAME = "{...}";

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

function safeParse({ filename, counter, babelPlugins }) {
  try {
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
  onScaningFile
}) {
  onScaningFile(filename);
  const ast = safeParse({ filename, counter, babelPlugins });
  if (!ast) {
    return;
  }
  traverse(ast, {
    JSXOpeningElement(path) {
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
    },
    JSXElement(path) {
      const name = getDottedName(path.node.openingElement.name);
      const childrenNames = path.node.children
        .filter(e => e.type === "JSXElement")
        .map(e => getDottedName(e.openingElement.name));
      counter.incrementComponentChildrenUsage(name, childrenNames);
    }
  });
}

function getUsage({
  components,
  onScaningFile,
  directory,
  gitignore,
  files,
  babelPlugins,
  sort
}) {
  const counter = new Counter({ sort });
  const filenames = globby.sync(files, {
    cwd: directory || process.cwd(),
    gitignore,
    absolute: true,
    onlyFiles: true
  });

  for (const filename of filenames) {
    updateUsageFromFile({
      componentsSet: new Set(components),
      counter,
      filename,
      babelPlugins,
      onScaningFile
    });
  }
  return counter;
}

module.exports = {
  getUsage
};
