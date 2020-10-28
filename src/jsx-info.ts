#!/usr/bin/env node
import chalk from "chalk";
import { main } from "./main";

function handleError(err: Error) {
  if (process.env.DEBUG === "true") {
    // eslint-disable-next-line no-console
    console.error(err);
  } else {
    // eslint-disable-next-line no-console
    console.error(chalk.bold.red(err.message));
  }
  process.exit(1);
}

main().catch(handleError);
