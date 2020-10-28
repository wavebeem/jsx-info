import { parse as babelParse, ParserPlugin } from "@babel/parser";
import traverse from "@babel/traverse";
import { JSXElement, Node } from "@babel/types";
import { SourceLocation } from "./api";

const EXPRESSION = Symbol("formatPropValue.EXPRESSION");

function formatPropValue(value: Node | null): string | symbol {
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

function getAttributeName(attributeNode: Node): string {
  switch (attributeNode.type) {
    case "JSXIdentifier":
      return attributeNode.name;
    case "JSXNamespacedName":
      return attributeNode.name.name;
    case "JSXAttribute":
      return getAttributeName(attributeNode.name);
    case "JSXSpreadAttribute":
      return "{...}";
    default:
      throw new Error(`unexpected node type: ${attributeNode.type}`);
  }
}

function createProp(attributeNode: Node) {
  return getAttributeName(attributeNode);
}

function getDottedName(nameNode: Node): string {
  switch (nameNode.type) {
    case "JSXMemberExpression":
      return [nameNode.object, nameNode.property].map(getDottedName).join(".");
    case "JSXIdentifier":
      return nameNode.name;
    default:
      throw new Error(`unexpected node type: ${nameNode.type}`);
  }
}

function createComponent(componentNode: JSXElement) {
  return getDottedName(componentNode.openingElement.name);
}

interface ParseOptions {
  typescript?: boolean;
  babelPlugins?: ParserPlugin[];
  onlyComponents?: string[];
  onComponent?: (componentName: string) => void;
  onProp?: (prop: {
    componentName: string;
    propName: string;
    propCode: string;
    startLoc: SourceLocation;
    endLoc: SourceLocation;
    propValue: string | symbol;
  }) => void;
}

export function parse(code: string, options: ParseOptions = {}) {
  const {
    typescript = false,
    babelPlugins = [],
    onlyComponents = [],
    onComponent = () => {},
    onProp = () => {},
  } = options;
  function doReportComponent(component: string) {
    if (onlyComponents.length === 0) {
      return true;
    }
    return onlyComponents.indexOf(component) !== -1;
  }
  const ast = babelParse(code, {
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
          const propCode = code.slice(propNode.start || 0, propNode.end || -1);
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
