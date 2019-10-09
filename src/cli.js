const program = require("commander");
const cosmiconfig = require("cosmiconfig");

const pkg = require("../package.json");

const explorer = cosmiconfig("jsx-info", {
  // TODO: Don't load YAML or JS files
});
try {
  const result = explorer.searchSync();
  console.log(result);
  if (result) {
    console.log("Loaded configuration from", result.filepath);
    // TODO: result.config
  } else {
    // TODO: Defaults
  }
} catch (err) {
  // TODO: Report config file parse error
}

function listOption(x, acc = []) {
  acc.push(x);
  return acc;
}

program.name(pkg.name);
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
    "glob pattern used to find input files",
    "**/*.{js,jsx,tsx}"
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
  // eslint-disable-next-line no-console
  console.log(`
Examples:
  # Display info for every component
  $ ${pkg.name}

  # Display info only for <div> and <Tab.Container>
  $ ${pkg.name} div Tab.Container

  # Ignore any folder named at any depth named \`__test__\`,
  # as well as \`packages/legacy\`
  $ ${pkg.name} --ignore '**/__test__' --ignore packages/legacy


  # Enable Babel plugins
  $ ${
    pkg.name
  } --add-babel-plugin decorators-legacy --add-babel-plugin pipelineOperator

Documentation can be found at https://github.com/wavebeem/jsx-info
`);
});

program.parse(process.argv);

exports.components = program.args;
exports.showProgress = program.progress;
exports.babelPlugins = program.addBabelPlugin;
exports.directory = program.directory;
exports.gitignore = program.gitignore;
exports.ignore = program.ignore || [];
exports.files = program.files;
exports.sort = program.sort || "usage";
exports.report = program.report || ["usage", "props"];
