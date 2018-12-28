const program = require("commander");

const pkg = require("../package.json");
const cmd = require("./cmd").default;

program.name(pkg.name);
program.version(pkg.version, "-v, --version");

// TODO:
// - Flag for --quiet to hide progress output
// - Flag for --sort <alphabetical|usage>
// - Flag for --report <all|...> to specify which data to report
// - Flag for --color <yes|no|auto>

program
  .arguments("[components...]")
  .description("Displays a report of JSX component and prop usage")
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
  console.log(`
Examples:
  # Display info for every component
  $ ${pkg.name}

  # Display info only for <div> and <Tab.Container>
  $ ${pkg.name} div Tab.Container

Documentation can be found at https://github.com/wavebeem/jsx-info
`);
});

function main() {
  program.parse(process.argv);
  cmd(program.args, program);
}

exports.default = main;
