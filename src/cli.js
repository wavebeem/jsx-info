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
    "--report <usage|props|lines>",
    "specify reports to show (repeatable)",
    listOption
  )
  .option(
    "--prop <PROP>",
    "which prop to search for when running `--report lines`"
  );

program.on("--help", () => {
  print(`
Examples:
  # Display info for every component
  $ npx jsx-info

  # Display info only for <div> and <Tab.Container>
  $ npx jsx-info div Tab.Container

  # See lines where className prop was used on div component
  $ npx jsx-info --report lines --prop className div

  # See lines where \`id\` prop was used on any component
  $ npx jsx-info --report lines --prop id

  # See lines where kind prop was used with value "primary" on Button component
  $ npx jsx-info --report lines --prop kind=primary Button

  # Ignore any folder named at any depth named \`__test__\`,
  # as well as \`packages/legacy\`
  $ npx jsx-info --ignore '**/__test__' --ignore packages/legacy

  # Enable Babel plugins
  $ npx jsx-info --add-babel-plugin decorators-legacy --add-babel-plugin pipelineOperator

  # Example .jsx-info.json config file
  {
    "babelPlugins": ["decorators-legacy", "pipelineOperator"],
    "directory": "src",
    "ignore": ["**/__test__", "legacy/**"],
    "files": ["**/*.{js,jsx,tsx}"]
  }

  # Find <Button kind="primary">
  $ npx jsx-info --report lines --prop kind=primary Button

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
      searchPlaces: ["package.json", ".jsx-info.json"],
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

exports.prop = program.prop;
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
