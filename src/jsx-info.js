#!/usr/bin/env node
const options = require("./cli");
const parser = require("./parser");
const printer = require("./printer");

if (options.showProgress) {
  printer.printProgress();
}
const { components, directory, gitignore, files, babelPlugins, sort } = options;

const counter = parser.getUsage({
  components,
  directory,
  gitignore,
  files,
  babelPlugins,
  sort,
  onScaningFile: filename => {
    if (options.showProgress) {
      printer.printScanningFile(filename);
    }
  }
});

if (options.showProgress) {
  printer.clearProgress();
}

// problems report
printer.printProblemsReport(counter);

const reportAll = options.report.includes("all");

// component usage report
if (reportAll || options.report.includes("usage")) {
  printer.printComponentsReport(counter);
}

// component props usage report
if (reportAll || options.report.includes("props")) {
  for (const comp of counter.getComponentsList()) {
    printer.printComponentPropsReport(counter, comp);
  }
}

// component children usage report
if (reportAll || options.report.includes("children")) {
  printer.printChildrenUsage(counter);
}
