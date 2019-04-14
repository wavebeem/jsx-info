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
const parse = require("./parse");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");

if (showProgress) {
  printer.printProgress();
}
const filenames = codeSource.searchForFiles({
  patterns: files,
  gitignore,
  directory,
  ignore
});
const reporter = new Reporter({ sortType: sort });
for (const filename of filenames) {
  if (showProgress) {
    printer.printScanningFile(filename);
  }
  try {
    parse(codeSource.codeFromFile(filename), {
      babelPlugins,
      typescript: filename.endsWith(".tsx") || filename.endsWith(".ts"),
      onlyComponents: components,
      onComponent: component => reporter.addComponent(component),
      onProp: (component, prop) => reporter.addProp(component, prop)
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      reporter.addParseError(filename, error);
    } else {
      throw error;
    }
  }
}
if (showProgress) {
  printer.clearProgress();
}
if (report.includes("usage")) {
  reporter.reportComponentUsage();
}
if (report.includes("props")) {
  reporter.reportPropUsage();
}
reporter.reportErrors();
