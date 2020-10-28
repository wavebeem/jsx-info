// @ts-nocheck

import parser from "@babel/parser";
import {
  StringLiteral,
  JSXElement,
  JSXFragment,
  JSXExpressionContainer,
  JSXIdentifier,
  JSXMemberExpression,
} from "@babel/types";
import traverse from "@babel/traverse";

const EXPRESSION = Symbol("formatPropValue.EXPRESSION");

function formatPropValue(
  value:
    | StringLiteral
    | JSXElement
    | JSXFragment
    | JSXExpressionContainer
    | null
): string | symbol {
  if (value === null) {
    return "true";
  }
  if (!value) {
    return EXPRESSION;
  }
  switch (value.type) {
    // TODO: Should we interpret anything else here?
    case "StringLiteral":
      return value.value;
    case "JSXExpressionContainer":
      return formatPropValue(value.expression);
    case "NumericLiteral":
    case "BooleanLiteral":
      return String(value.value);
    default:
      return EXPRESSION;
  }
}

function createProp(attributeNode) {
  function getAttributeName(
    attributeNode: JSXIdentifier | JSXMemberExpression
  ) {
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
  function getDottedName(nameNode: JSXIdentifier | JSXMemberExpression) {
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
    onProp = () => {},
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
      ...babelPlugins,
    ],
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
          const startLoc = propNode.loc!.start;
          const endLoc = propNode.loc!.end;
          const propValue =
            "value" in propNode
              ? formatPropValue(propNode.value)
              : formatPropValue(null);
          onProp({
            componentName,
            propName,
            propCode,
            startLoc,
            endLoc,
            propValue,
          });
        }
      }
    },
  });
}

module.exports = parse;
