const program = require("commander");

const pkg = require("../package.json");
const cmd = require("./cmd").default;

function concat(x, acc) {
  acc.push(x);
  return acc;
}

program.name(pkg.name);
program.version(pkg.version, "-v, --version");

// TODO:
// - Flag for --sort <alphabetical|usage>
// - Flag for --report <all|...> to specify which data to report

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
  .option(
    "--add-babel-plugin <plugin>",
    "add a babel plugin (can be repeated)",
    concat,
    []
  )
  .option("--no-gitignore", "disable reading .gitignore files")
  .option(
    "--directory <directory>",
    "directory to use as the base for finding files instead of cwd"
  )
  .option(
    "--files <pattern>",
    "glob pattern used to find input files",
    "**/*.{js,jsx,tsx}"
  );

program.on("--help", () => {
  // eslint-disable-next-line no-console
  console.log(`
Examples:
  # Display info for every component
  $ ${pkg.name}

  # Display info only for <div> and <Tab.Container>
  $ ${pkg.name} div Tab.Container


  # Enable Babel plugins
  $ ${
    pkg.name
  } --add-babel-plugin decorators-legacy --add-babel-plugin pipelineOperator

Documentation can be found at https://github.com/wavebeem/jsx-info
`);
});

function main() {
  program.parse(process.argv);
  cmd();
}

exports.default = main;
