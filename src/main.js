const {
  directory,
  gitignore,
  files,
  components,
  report,
  sort,
  showProgress,
  babelPlugins,
  ignore,
  prop
} = require("./cli");
const parse = require("./parse");
const Reporter = require("./reporter");
const printer = require("./printer");
const codeSource = require("./code-source");
const { formatPrettyCode } = require("./formatPrettyCode");
const { EXPRESSION } = require("./formatPropValue");

async function sleep() {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
}

async function main() {
  if (!prop && report.includes("lines")) {
    throw new Error("`--prop` argument required for `lines` report");
  }
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
      const code = codeSource.codeFromFile(filename);
      parse(code, {
        babelPlugins,
        typescript: filename.endsWith(".tsx") || filename.endsWith(".ts"),
        onlyComponents: components,
        onComponent: componentName => {
          reporter.addComponent(componentName);
        },
        onProp: ({
          componentName,
          propName,
          propCode,
          startLoc,
          endLoc,
          propValue
        }) => {
          if (prop) {
            let wantPropKey = prop;
            let wantPropValue = undefined;
            if (prop.includes("=")) {
              const index = prop.indexOf("=");
              const key = prop.slice(0, index);
              const val = prop.slice(index + 1);
              wantPropKey = key;
              wantPropValue = val;
            }
            if (propName !== wantPropKey) {
              return;
            }
            if (wantPropValue !== undefined && propValue !== wantPropValue) {
              return;
            }
          }
          const prettyCode = formatPrettyCode(code, startLoc.line, endLoc.line);
          reporter.addProp({
            componentName,
            propName,
            propCode,
            startLoc,
            endLoc,
            prettyCode,
            filename
          });
        }
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
    `Scanned ${filenames.length} files in ${totalTime.toFixed(1)} seconds`
  );
  if (report.includes("usage")) {
    reporter.reportComponentUsage();
  }
  if (report.includes("props")) {
    reporter.reportPropUsage();
  }
  if (report.includes("lines")) {
    reporter.reportLinesUsage();
  }
  reporter.reportErrors();
}

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
