const path = require("path");
const program = require("commander");
const cosmiconfig = require("cosmiconfig");

const pkg = require("../package.json");
const { print, printError } = require("./printer");

function listOption(x, acc = []) {
  acc.push(x);
  return acc;
}

program.name("jsx-info");
program.version(pkg.version, "-v, --version");
program
  .arguments("[components...]")
  .description("Displays a report of JSX component and prop usage")
  .option("--no-progress", "do not show progress messages")
  // NOTE: chalk automatically reads process.argv for these flags, and commander
  // does not correctly handle allowing both "--foo" and "--no-foo" flags
  //
  // https://github.com/tj/commander.js/issues/108
  .option("--color", "force enable color")
  .option("--no-color", "force disable color")
  .option("--no-config", "disable config file")
  .option("--no-gitignore", "disable reading .gitignore files")
  .option(
    "--add-babel-plugin <PLUGIN>",
    "adds a babel plugin (repeatable)",
    listOption
  )
  .option(
    "--directory <DIRECTORY>",
    "directory to use as the base for finding files instead of cwd"
  )
  .option(
    "--ignore <PATTERN>",
    "adds a glob pattern used to ignore input files (repeatable)",
    listOption
  )
  .option(
    "--files <PATTERN>",
    "glob pattern used to find input files (repeatable)",
    listOption
  )
  .option(
    "--sort <alphabetical|usage>",
    "specify sort type of the report",
    /^(alphabetical|usage)$/i
  )
  .option(
    "--report <usage|props>",
    "specify reports to show (repeatable)",
    listOption
  );

program.on("--help", () => {
  print(`
Examples:
  # Display info for every component
  $ jsx-info

  # Display info only for <div> and <Tab.Container>
  $ jsx-info div Tab.Container

  # Ignore any folder named at any depth named \`__test__\`,
  # as well as \`packages/legacy\`
  $ jsx-info --ignore '**/__test__' --ignore packages/legacy


  # Enable Babel plugins
  $ jsx-info --add-babel-plugin decorators-legacy --add-babel-plugin pipelineOperator

  # Example .jsx-info.json config file
  {
    "babelPlugins": ["decorators-legacy", "pipelineOperator"],
    "directory": "src",
    "ignore": ["**/__test__", "legacy/**"],
    "files": ["**/*.{js,jsx,tsx}"]
  }

Full documentation can be found at https://github.com/wavebeem/jsx-info
`);
});

program.parse(process.argv);

function getConfig() {
  if (!program.config) {
    return {};
  }
  try {
    const explorer = cosmiconfig("jsx-info", {
      searchPlaces: ["package.json", ".jsx-info.json"]
    });
    const result = explorer.searchSync();
    if (result) {
      print(`Loaded configuration from ${result.filepath}\n`);
      if (result.config.directory) {
        result.config.directory = path.resolve(
          result.filepath,
          "..",
          result.config.directory
        );
      }
      return result.config;
    }
  } catch (err) {
    printError("failed to parse config file");
  }
  return {};
}

const config = getConfig();

function concat(a, b) {
  return [...(a || []), ...(b || [])];
}

exports.components = program.args;
exports.showProgress = program.progress;
exports.babelPlugins = concat(config.babelPlugins, program.addBabelPlugin);
exports.directory = program.directory || config.directory;
exports.gitignore = program.gitignore;
exports.ignore = concat(program.ignore, config.ignore);
exports.files = concat(program.files, config.files);
if (exports.files.length === 0) {
  exports.files = ["**/*.{js,jsx,tsx}"];
}
exports.sort = program.sort || "usage";
exports.report = program.report || ["usage", "props"];
