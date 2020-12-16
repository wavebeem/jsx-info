# v2.1.0

- Added support for `--prop '!propName'` to search for all usages of a component
  where `propName` is not used
- Added support for `--prop 'propName!=value'` to search for all usages of a
  component where `propName`'s value is **not** `value`

# v2.0.0

- Added a full JS API for library usage
- Changed `--add-babel-plugin a --add-babel-plugin b` to `--babel-plugins a b`
- Changed `--ignore a --ignore b` to `--ignore a b`
- Changed `--files a --files b` to `--files a b`
- Changed `jsx-info a b c` to `jsx-info --components a b c`
- Changed `jsx-info` to `jsx-info --components "*"`
- Running `jsx-info` with missing arguments now enters interactive mode
- Removed the `--sort <...>` flag

# v1.6.1

- Crash fix

# v1.6.0

- Adds `--report lines --prop <PROP[=value]>` option
- Adds config file support

# v1.5.0

- Prop usage graphs are now relative to the number of component usages, rather
  than relative to the number of total props used across all component usages.
  This means that a "full" prop bar corresponds to a prop used in every usage of
  that component.

# v1.4.0

- Fixes number alignment for 4+ digit numbers
- Shows the number of files scanned, and how long it took

# v1.3.0

- Adds `--report <...>` flag
- Adds `--sort <...>` flag
- Improves loading spinner

# v1.2.3

- Fixes crash if there were no `--add-babel-plugin` flags

# v1.2.2

- No changes

# v1.2.1

- Fixes crash if there were no `--ignore` flags

# v1.2.0

- Adds `--ignore <pattern>` flag
- Makes `--files <pattern>` flag repeatable

# v1.1.0

- Adds `--color` flag
- Adds `--no-color` flag
- Adds `--no-progress` flag
- Adds `--add-babel-plugin <plugin>` flag
- Improves parse error formatting
- Adds suggestions on which Babel plugins to add

# v1.0.1

- Updates package.json to point at the GitHub repo
- Corrects typo in keywords

# v1.0.0

- Initial release
