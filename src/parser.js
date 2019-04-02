const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const EventEmitter = require("events").EventEmitter;

function createProp(attributeNode) {
  return getPropName(attributeNode);

  function getPropName(attributeNode) {
    switch (attributeNode.type) {
      case "JSXAttribute":
        return attributeNode.name.name;
      case "JSXSpreadAttribute":
        return "{...}";
      default:
        throw new Error(`unexpected node type: ${attributeNode.type}`);
    }
  }
}

function createComponent(componentNode) {
  return getDottedName(componentNode.openingElement.name);

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
}

/**
 * @typedef Options
 * @property {boolean} typescript is the code in typescript default `false`
 * @property {string[]} babelPlugins additional babel plugins to be used
 * @property {string[]} onlyComponents emitt for only these components
 */

/**
 * @param {string} code the code containing JSX
 * @param {Options? = {}} options parsing options
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
    onlyComponents = []
  } = options;

  const emitter = new EventEmitter();
  // process.nextTick allows the caller of this function
  // to register his listeners safely
  process.nextTick(() => {
    try {
      _parse();
      emitter.emit("finish");
    } catch (error) {
      emitter.emit("error", error);
    }
  });
  return emitter;

  function doReportComponent(component) {
    if (onlyComponents.length === 0) return true;
    return onlyComponents.indexOf(component) !== -1;
  }

  function _parse() {
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
          emitter.emit("component", component);

          // Attributes
          for (const propNode of node.openingElement.attributes) {
            emitter.emit("prop", component, createProp(propNode));
          }
        }

        // Parent
        const closestParentPath = path.findParent(
          path => path.node.type === "JSXElement"
        );

        if (closestParentPath) {
          const parentComponent = createComponent(closestParentPath.node);
          if (doReportComponent(parentComponent)) {
            emitter.emit("child", parentComponent, component);
          }
        }
      }
    });
  }
}

module.exports = parse;
