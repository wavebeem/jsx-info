const chalk = require("chalk");
const logUpdate = require("log-update");

exports.styleComponentName = componentName => {
  return chalk.bold.cyan("<" + componentName + ">");
};

exports.stylePropName = propName => {
  return chalk.bold(propName);
};

exports.styleNumber = number => {
  return chalk.bold(number);
};

exports.styleError = errorMessage => {
  return chalk.bold.red(errorMessage);
};

exports.createTextMeter = total => {
  return function(count) {
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
};

exports.styleHeading = (...args) => {
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
exports.clearProgress = () => {
  progressLogger.clear();
};

exports.printProgress = () => {
  progressLogger(exports.styleHeading("Finding files"));
};

exports.printScanningFile = filename => {
  progressLogger(
    exports.styleHeading("Scanning files ", spinner),
    filename,
    `\n`
  );
};

// eslint-disable-next-line no-console
exports.print = console.log.bind(console);
