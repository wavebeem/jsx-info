const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const { formatPropValue } = require("./formatPropValue");

function createProp(attributeNode) {
  function getAttributeName(attributeNode) {
    switch (attributeNode.type) {
      case "JSXAttribute":
        return attributeNode.name.name;
      case "JSXSpreadAttribute":
        return "{...}";
      default:
        throw new Error(`unexpected node type: ${attributeNode.type}`);
    }
  }
  return getAttributeName(attributeNode);
}

function createComponent(componentNode) {
  function getDottedName(nameNode) {
    switch (nameNode.type) {
      case "JSXMemberExpression":
        return [nameNode.object, nameNode.property]
          .map(getDottedName)
          .join(".");
      case "JSXIdentifier":
        return nameNode.name;
      default:
        throw new Error(`unexpected node type: ${nameNode.type}`);
    }
  }
  return getDottedName(componentNode.openingElement.name);
}

function parse(code, options = {}) {
  const {
    typescript = false,
    babelPlugins = [],
    onlyComponents = [],
    onComponent = () => {},
    onProp = () => {}
  } = options;
  function doReportComponent(component) {
    if (onlyComponents.length === 0) {
      return true;
    }
    return onlyComponents.indexOf(component) !== -1;
  }
  const ast = parser.parse(code, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    plugins: [
      typescript ? "typescript" : "flow",
      "jsx",
      "dynamicImport",
      "classProperties",
      "objectRestSpread",
      ...babelPlugins
    ]
  });
  traverse(ast, {
    JSXElement(path) {
      const node = path.node;
      const componentName = createComponent(node);
      if (doReportComponent(componentName)) {
        onComponent(componentName);
        for (const propNode of node.openingElement.attributes) {
          const propCode = code.slice(propNode.start, propNode.end);
          const propName = createProp(propNode);
          const startLoc = propNode.loc.start;
          const endLoc = propNode.loc.end;
          const propValue = formatPropValue(propNode.value);
          onProp({
            componentName,
            propName,
            propCode,
            startLoc,
            endLoc,
            propValue
          });
        }
      }
    }
  });
}

module.exports = parse;
