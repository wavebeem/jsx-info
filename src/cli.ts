import { ParserPlugin } from "@babel/parser";
import program from "commander";
import { cosmiconfigSync } from "cosmiconfig";
import path from "path";
import { version } from "../package.json";
import { ReportType } from "./api";
import { print, printError, styleTitle } from "./printer";

function listOption<T>(x: T, acc: T[] = []): T[] {
  acc.push(x);
  return acc;
}

program.name("jsx-info");
program.version(version, "-v, --version");
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
  .option("--report <usage|props|lines>", "specify which report to show")
  .option(
    "--prop <PROP>",
    "which prop to search for when running a lines report"
  );

program.on("--help", () => {
  print(`
Examples:
  Use jsx-info interactively:
      npx jsx-info

  Display info only for <div> and <Tab.Container>
      npx jsx-info div Tab.Container

  See lines where className prop was used on <div> component
      npx jsx-info --report lines --prop className div

  See lines where \`id\` prop was used on any component
      npx jsx-info --report lines --prop id "*"

  See lines where kind prop was used with value "primary" on Button component
      npx jsx-info --report lines --prop kind=primary Button

  Ignore folders based on glob paths
      npx jsx-info --ignore '**/__test__' --ignore packages/legacy

  Enable Babel plugins
      npx jsx-info --add-babel-plugin decorators-legacy --add-babel-plugin pipelineOperator

  Example .jsx-info.json config file
      {
        "babelPlugins": ["decorators-legacy", "pipelineOperator"],
        "directory": "src",
        "ignore": ["**/__test__", "legacy/**"],
        "files": ["**/*.{js,jsx,tsx}"]
      }
`);
});

program.parse(process.argv);

print(styleTitle(`jsx-info ${version} by @wavebeem`));

function getConfig() {
  if (!program.config) {
    return {};
  }
  try {
    const explorer = cosmiconfigSync("jsx-info", {
      searchPlaces: ["package.json", ".jsx-info.json"],
    });
    const result = explorer.search();
    if (result) {
      print(`\nLoaded configuration from ${result.filepath}\n`);
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
    if (process.env.DEBUG === "true") {
      // eslint-disable-next-line no-console
      console.log(err.stack);
    }
    printError("failed to parse config file");
  }
  return {};
}

const config = getConfig();

function concat<T>(a: T[] = [], b: T[] = []): T[] {
  return [...a, ...b];
}

export const prop: string = program.prop;
export const components: string[] = program.args;
export const showProgress: boolean = program.progress;
export const babelPlugins: ParserPlugin[] = concat(
  config.babelPlugins,
  program.addBabelPlugin
);
export const directory: string = program.directory || config.directory;
export const gitignore: boolean = program.gitignore;
export const ignore: string[] = concat(program.ignore, config.ignore);
export const files: string[] = concat<string>(program.files, config.files);
export const report: ReportType = program.report;
