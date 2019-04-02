const program = require("commander");
const pkg = require("../package.json");

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
    "--add-babel-plugin <plugin>",
    "adds a babel plugin (repeatable)",
    listOption
  )
  .option(
    "-d, --directory <directory>",
    "directory to use as the base for finding files instead of cwd"
  )
  .option(
    "--ignore <pattern>",
    "adds a glob pattern used to ignore input files (repeatable)",
    listOption
  )
  .option(
    "--files <pattern>",
    "glob pattern used to find input files",
    "**/*.{js,jsx,tsx}"
  )
  .option(
    "-s, --sort <alphabetical|usage>",
    "specify sort type of the report",
    /^(alphabetical|usage)$/i,
    "usage"
  )
  .option(
    "-r, --report <usage|props|children>",
    "specify reports to show (can be repeted)",
    listOption
  )
  .parse(process.argv);

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

module.exports = {
  components: program.args,
  showProgress: program.progress,
  babelPlugins: program.addBabelPlugin,
  directory: program.directory,
  gitignore: program.gitignore,
  files: program.files,
  sort: program.sort,
  report: program.report
};
