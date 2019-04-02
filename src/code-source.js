const globby = require("globby");
const fs = require("fs");

exports.codeFromFile = filename => fs.readFileSync(filename, "utf8");

exports.searchForFiles = (patterns, gitignore, directory) => {
  return globby.sync(patterns, {
    absolute: true,
    onlyFiles: true,
    gitignore,
    cwd: directory || process.cwd()
  });
};
