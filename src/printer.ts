import chalk from "chalk";
import ora from "ora";

const CHAR_BOX_FULL = chalk.bold.green("*");
const CHAR_BOX_LIGHT = chalk.bold.red("-");

export function textMeter(total: number, count: number): string {
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

export function heading(...args: any[]): string {
  return "\n" + chalk.cyan(...args);
}

export const spinner = ora();

// eslint-disable-next-line no-console
export const print = console.log.bind(console);

// eslint-disable-next-line no-console
export const printError = console.error.bind(console);
