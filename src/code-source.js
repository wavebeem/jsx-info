const globby = require("globby");
const fs = require("fs");

exports.codeFromFile = filename => fs.readFileSync(filename, "utf8");

exports.searchForFiles = ({ patterns, gitignore, directory, ignore }) => {
  return globby.sync(patterns, {
    absolute: true,
    onlyFiles: true,
    gitignore,
    ignore,
    cwd: directory || process.cwd()
  });
};
