const parse = require("./parse");
const Reporter = require("./reporter");
const codeSource = require("./code-source");
const { formatPrettyCode } = require("./formatPrettyCode");
const { sleep } = require("./sleep");

async function analyze({
  babelPlugins = [],
  components,
  directory,
  files = ["**/*.{js,jsx,tsx}"],
  gitignore = true,
  ignore = [],
  onFile,
  onStart,
  prop,
  report = ["usage", "props"],
  sort = "usage",
} = {}) {
  if (!prop && report.includes("lines")) {
    throw new Error("`prop` option required for `lines` report");
  }
  const timeStart = Date.now();
  if (onStart) {
    await onStart();
  }
  const filenames = await codeSource.searchForFiles({
    patterns: files,
    gitignore,
    directory,
    ignore,
  });
  const reporter = new Reporter({ sortType: sort });
  for (const filename of filenames) {
    if (onFile) {
      await onFile(filename);
    } else {
      await sleep();
    }
    try {
      const code = codeSource.codeFromFile(filename);
      parse(code, {
        babelPlugins,
        typescript: filename.endsWith(".tsx") || filename.endsWith(".ts"),
        onlyComponents: components,
        onComponent: (componentName) => {
          reporter.addComponent(componentName);
        },
        onProp: ({
          componentName,
          propName,
          propCode,
          startLoc,
          endLoc,
          propValue,
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
            filename,
          });
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        reporter.addParseError(filename, error);
      } else {
        throw error;
      }
    }
  }
  const elapsedTime = (Date.now() - timeStart) / 1000;
  return {
    filenames,
    totals: reporter.getTotals(),
    componentUsage: reporter.getComponentUsage(),
    propUsage: reporter.getPropUsage(),
    lineUsage: reporter.getLineUsage(),
    errors: reporter.getErrors(),
    suggestedPlugins: reporter.getSuggestedPlugins(),
    elapsedTime: elapsedTime,
  };
}

exports.analyze = analyze;
