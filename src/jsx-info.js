#!/usr/bin/env node
const {
  directory,
  gitignore,
  files,
  components,
  report,
  sort,
  showProgress
} = require("./cli");
const parser = require("./parser");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");

// Find Files
if (showProgress) printer.printProgress();
const filenames = codeSource.searchForFiles(files, gitignore, directory);

// Scan Files
const reporter = new Reporter(sort);
const scanTasks = filenames.map(filename => {
  return new Promise((res, rej) => {
    if (showProgress) printer.printScanningFile(filename);

    parser(codeSource.codeFromFile(filename), {
      onlyComponents: components
    })
      .on("component", reporter.addComponent.bind(reporter))
      .on("prop", reporter.addProp.bind(reporter))
      .on("child", reporter.addChild.bind(reporter))
      .on("finish", res)
      .on("error", error => {
        if (error instanceof SyntaxError) {
          reporter.addParseError(filename, error);
          res();
        } else {
          rej(error);
        }
      });
  });
});

// Report
Promise.all(scanTasks).then(() => {
  printer.clearProgress();
  if (!report.length) {
    reporter.reportComponentUsage();
    reporter.reportPropUsage();
    reporter.reportChildrenUsage();
  } else {
    if (report.indexOf("usage") !== -1) {
      reporter.reportComponentUsage();
    }
    if (report.indexOf("props") !== -1) {
      reporter.reportPropUsage();
    }
    if (report.indexOf("children") !== -1) {
      reporter.reportChildrenUsage();
    }
  }
  reporter.reportErrors();
});
