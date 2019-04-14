const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

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

/**
 * @typedef Options
 * @property {boolean} typescript is the code in typescript default `false`
 * @property {string[]} babelPlugins additional babel plugins to be used
 * @property {string[]} onlyComponents feedback for only these components
 * @property {(component:string) => void} onComponent called when a component was found
 * @property {(component:string, prop:string) => void} onProp called when a component prop was found
 */

/**
 * @param {string} code the code containing JSX
 * @param {Options?} options parsing options
 */
function parse(code, options = {}) {
  const {
    typescript = false,
    babelPlugins = [],
    onlyComponents = [],
    onComponent = () => {},
    onProp = () => {}
  } = options;
  function doReportComponent(component) {
    if (onlyComponents.length === 0) return true;
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
      const component = createComponent(node);
      if (doReportComponent(component)) {
        onComponent(component);
        for (const propNode of node.openingElement.attributes) {
          onProp(component, createProp(propNode));
        }
      }
    }
  });
}

module.exports = parse;
