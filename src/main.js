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
const sleep = require("./sleep");
const parse = require("./parse");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");

async function main() {
  const timeStart = Date.now();
  if (showProgress) {
    printer.spinner.text = "Finding files";
    printer.spinner.start();
  }
  const filenames = await codeSource.searchForFiles({
    patterns: files,
    gitignore,
    directory,
    ignore
  });
  const reporter = new Reporter({ sortType: sort });
  for (const filename of filenames) {
    if (showProgress) {
      printer.spinner.text = `Scanning files\n\n${filename}`;
      // We need to sleep briefly here since parse isn't asnyc and the `ora`
      // spinner library assumes the event loop will be ticking periodically
      await sleep();
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
    printer.spinner.stop();
  }
  const totalTime = (Date.now() - timeStart) / 1000;
  printer.print(
    printer.styleHeading(
      `Scanned ${filenames.length} files in ${totalTime.toFixed(1)} seconds`
    )
  );
  if (report.includes("usage")) {
    reporter.reportComponentUsage();
  }
  if (report.includes("props")) {
    reporter.reportPropUsage();
  }
  reporter.reportErrors();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
