#!/usr/bin/env node
const { main } = require("./main");

main().catch(err => {
  if (process.env.DEBUG === "true") {
    // eslint-disable-next-line no-console
    console.error(err);
  } else {
    // eslint-disable-next-line no-console
    console.error(err.message);
  }
  process.exit(1);
});
