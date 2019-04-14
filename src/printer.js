const chalk = require("chalk");
const logUpdate = require("log-update");

const styleComponentName = componentName => {
  return chalk.bold("<" + componentName + ">");
};

const stylePropName = propName => {
  return chalk.bold(propName);
};

const styleNumber = number => {
  return chalk.bold(number);
};

const styleError = errorMessage => {
  return chalk.bold.red(errorMessage);
};

const textMeter = (total, count) => {
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

class Spinner {
  constructor() {
    this.speed = 100;
    this.time = Date.now();
    this.frame = "▒▓▒░░░░";
  }

  toString() {
    const time = Date.now();
    const dt = time - this.time;
    if (dt > this.speed) {
      this.time = time;
      this.frame = this.frame.slice(-1) + this.frame.slice(0, -1);
    }
    return this.frame;
  }
}

const spinner = new Spinner();
const progressLogger = logUpdate.create(process.stderr, {
  showCursor: true
});
const clearProgress = () => {
  progressLogger.clear();
};

const printProgress = () => {
  progressLogger(styleHeading("Finding files"));
};

const printScanningFile = filename => {
  progressLogger(styleHeading("Scanning files ", spinner), filename, `\n`);
};

// eslint-disable-next-line no-console
const print = console.log.bind(console);

exports.styleComponentName = styleComponentName;
exports.stylePropName = stylePropName;
exports.styleError = styleError;
exports.styleNumber = styleNumber;
exports.textMeter = textMeter;
exports.styleHeading = styleHeading;
exports.clearProgress = clearProgress;
exports.printProgress = printProgress;
exports.printScanningFile = printScanningFile;
exports.print = print;
