const globby = require("globby");
const fs = require("fs");

const codeFromFile = filename => fs.readFileSync(filename, "utf8");

const searchForFiles = ({ patterns, gitignore, directory, ignore }) => {
  return globby.sync(patterns, {
    absolute: true,
    onlyFiles: true,
    gitignore,
    ignore,
    cwd: directory || process.cwd()
  });
};

exports.codeFromFile = codeFromFile;
exports.searchForFiles = searchForFiles;
