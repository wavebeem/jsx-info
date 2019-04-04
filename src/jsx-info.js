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
const parse = require("./parser");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");

// Find Files
if (showProgress) printer.printProgress();
const filenames = codeSource.searchForFiles(files, gitignore, directory);

// Scan Files
const reporter = new Reporter(sort);
for (const filename of filenames) {
  if (showProgress) printer.printScanningFile(filename);

  try {
    parse(codeSource.codeFromFile(filename), {
      onlyComponents: components,
      onComponent: reporter.addComponent.bind(reporter),
      onChild: reporter.addChild.bind(reporter),
      onProp: reporter.addProp.bind(reporter)
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      reporter.addParseError(filename, error);
    } else {
      throw error;
    }
  }
}

// Report
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
