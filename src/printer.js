const chalk = require("chalk");
const ora = require("ora");

const styleComponentName = (componentName) => {
  return chalk.bold("<" + componentName + ">");
};

const stylePropName = (propName) => {
  return chalk.bold(propName);
};

const styleNumber = (number) => {
  return chalk.bold(number);
};

const styleError = (errorMessage) => {
  return chalk.bold.red(errorMessage);
};

const textMeter = (total, count) => {
  if (typeof total !== "number") {
    throw new Error("total must be a number");
  }
  if (typeof count !== "number") {
    throw new Error("count must be a number");
  }
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
};

const styleHeading = (...args) => {
  return "\n" + chalk.cyan(...args);
};

const spinner = ora();

// eslint-disable-next-line no-console
const print = console.log.bind(console);

// eslint-disable-next-line no-console
const printError = console.error.bind(console);

exports.styleComponentName = styleComponentName;
exports.stylePropName = stylePropName;
exports.styleError = styleError;
exports.styleNumber = styleNumber;
exports.textMeter = textMeter;
exports.styleHeading = styleHeading;
exports.spinner = spinner;
exports.print = print;
exports.printError = printError;
