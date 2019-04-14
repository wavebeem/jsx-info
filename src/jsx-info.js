#!/usr/bin/env node
const {
  directory,
  gitignore,
  files,
  components,
  report,
  sort,
  showProgress,
  babelPlugins,
  ignore
} = require("./cli");
const parse = require("./parser");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");

// Find Files
if (showProgress) printer.printProgress();
const filenames = codeSource.searchForFiles({
  patterns: files,
  gitignore,
  directory,
  ignore
});

// Scan Files
const reporter = new Reporter(sort);
for (const filename of filenames) {
  if (showProgress) printer.printScanningFile(filename);

  try {
    parse(codeSource.codeFromFile(filename), {
      babelPlugins,
      onlyComponents: components,
      onComponent: reporter.addComponent,
      onProp: reporter.addProp
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
} else {
  if (report.indexOf("usage") !== -1) {
    reporter.reportComponentUsage();
  }
  if (report.indexOf("props") !== -1) {
    reporter.reportPropUsage();
  }
}
reporter.reportErrors();
