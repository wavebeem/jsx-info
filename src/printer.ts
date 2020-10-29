import chalk from "chalk";
import ora from "ora";

export const spinner = ora();

// eslint-disable-next-line no-console
export const print = console.log.bind(console);

// eslint-disable-next-line no-console
export const printError = console.error.bind(console);

export function textMeter(total: number, count: number): string {
  const fill = chalk.bold.green("*");
  const empty = chalk.bold.red("-");
  const size = 10;
  let str = "";
  let first = Math.ceil((count / total) * size);
  let rest = size - first;
  while (first-- > 0) {
    str += fill;
  }
  while (rest-- > 0) {
    str += empty;
  }
  return str;
}
