#!/usr/bin/env node
import chalk from "chalk";
import { main } from "./main";
import { printError } from "./printer";

main().catch((err) => {
  if (process.env.DEBUG) {
    printError(err);
  } else {
    printError(chalk.bold.red(err.message));
  }
  process.exit(1);
});
