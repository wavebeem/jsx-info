import chalk from "chalk";
import ora from "ora";

export function styleComponentName(componentName: string): string {
  return chalk.bold("<" + componentName + ">");
}

export function stylePropName(propName: string): string {
  return chalk.bold(propName);
}

export function styleNumber(number: string): string {
  return chalk.bold(number);
}

export function styleError(errorMessage: string): string {
  return chalk.bold.red(errorMessage);
}

export function textMeter(total: number, count: number): string {
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
}

export function styleHeading(...args: any[]): string {
  return "\n" + chalk.cyan(...args);
}

export const spinner = ora();

// eslint-disable-next-line no-console
export const print = console.log.bind(console);

// eslint-disable-next-line no-console
export const printError = console.error.bind(console);
