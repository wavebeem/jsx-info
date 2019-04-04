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
 * @property {string[]} onlyComponents emitt for only these components
 * @property {(component:string) => void} onComponent called when a component was found
 * @property {(component:string, prop:string) => void} onProp called when a component prop was found
 * @property {(component:string, child:string) => void} onChild called when a component child was found
 */

/**
 * @param {string} code the code containing JSX
 * @param {Options?} options parsing options
 * @returns {import('events').EventEmitter}
 *
 * event names are:
 * - `component` a new component found
 * - `prop` a new prop of a component found
 * - `child` a child of a component found
 */
function parse(code, options = {}) {
  const {
    typescript = false,
    babelPlugins = [],
    onlyComponents = [],
    onComponent = () => {},
    onChild = () => {},
    onProp = () => {}
  } = options;

  function doReportComponent(component) {
    if (onlyComponents.length === 0) return true;
    return onlyComponents.indexOf(component) !== -1;
  }
  // Generate AST
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

  // Traverse
  traverse(ast, {
    JSXElement(path) {
      const node = path.node;
      const component = createComponent(node);

      if (doReportComponent(component)) {
        // Component
        onComponent(component);

        // Attributes
        for (const propNode of node.openingElement.attributes) {
          onProp(component, createProp(propNode));
        }
      }

      // Parent
      const closestParentPath = path.findParent(
        path => path.node.type === "JSXElement"
      );

      if (closestParentPath) {
        const parentComponent = createComponent(closestParentPath.node);
        if (doReportComponent(parentComponent)) {
          onChild(parentComponent, component);
        }
      }
    }
  });
}

module.exports = parse;
