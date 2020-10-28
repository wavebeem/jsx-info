import { ParserPlugin } from "@babel/parser";
import chalk from "chalk";
import program from "commander";
import { cosmiconfigSync } from "cosmiconfig";
import path from "path";
import { version } from "../package.json";
import { ReportType } from "./api";
import { print, printError } from "./printer";

program.name("jsx-info");
program.version(version, "-v, --version");
program
  .description("Displays a report of JSX component and prop usage")
  .option("--no-progress", "don't show progress messages")
  .option("--components <components...>", "which components to scan")
  .option("--color", "force enable color")
  .option("--no-color", "force disable color")
  .option("--no-config", "disable config file")
  .option("--no-gitignore", "disable reading .gitignore files")
  .option("--babel-plugins <plugins...>", "set Babel plugins")
  .option(
    "--directory <directory>",
    "directory to use as the base for finding files"
  )
  .option("--ignore <patterns...>", "glob patterns used to ignore input files")
  .option("--files <patterns...>", "glob patterns used to find input files")
  .option("--report <usage|props|lines>", "which report to show")
  .option(
    "--prop <prop[=value]>",
    "which prop to search for when running a lines report"
  );

program.on("--help", () => {
  print(chalk`
Examples:
  Use jsx-info interactively:
      {bold.cyan npx jsx-info}

  Display info only for <div> and <Tab.Container>
      {bold.cyan npx jsx-info --components} {underline.magenta div Tab.Container}

  See lines where className prop was used on <div> component
      {bold.cyan npx jsx-info --report} {underline.magenta lines} {bold.cyan --prop} {underline.magenta className} {bold.cyan --components} {underline.magenta div}

  See lines where \`id\` prop was used on any component
      {bold.cyan npx jsx-info --report} {underline.magenta lines} {bold.cyan --prop} {underline.magenta id} {bold.cyan --components} {underline.magenta "*"}

  See lines where kind prop was used with value "primary" on Button component
      {bold.cyan npx jsx-info --report} {underline.magenta lines} {bold.cyan --prop} {underline.magenta kind=primary} {bold.cyan --components} {underline.magenta Button}

  Ignore folders based on glob paths
      {bold.cyan npx jsx-info --ignore} {underline.magenta "**/__test__"} {underline.magenta packages/legacy}

  Enable Babel plugins
      {bold.cyan npx jsx-info --babel-plugins} {underline.magenta decorators-legacy} {underline.magenta pipelineOperator}

  Example .jsx-info.json config file
      ${"{"}
        {cyan "babelPlugins"}: [{magenta "decorators-legacy"}, {magenta "pipelineOperator"}],
        {cyan "directory"}: {magenta "src"},
        {cyan "ignore"}: [{magenta "**/__test__"}, {magenta "legacy/**"}],
        {cyan "files"}: [{magenta "**/*.${"{"}js,jsx,tsx${"}"}"}]
      ${"}"}
`);
});

program.parse(process.argv);

print(chalk.magenta.bold(`jsx-info ${version} by @wavebeem`));

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
    if (process.env.DEBUG) {
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
export const components: string[] = program.components;
export const showProgress: boolean = program.progress;
export const babelPlugins: ParserPlugin[] = concat(
  config.babelPlugins,
  program.babelPlugins
);
export const directory: string = program.directory || config.directory;
export const gitignore: boolean = program.gitignore;
export const ignore: string[] = concat(program.ignore, config.ignore);
export const files: string[] = concat<string>(program.files, config.files);
export const report: ReportType = program.report;
