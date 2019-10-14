const EXPRESSION = Symbol("formatPropValue.EXPRESSION");

function formatPropValue(value) {
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

exports.EXPRESSION = EXPRESSION;
exports.formatPropValue = formatPropValue;
