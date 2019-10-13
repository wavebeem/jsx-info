const printer = require("./printer");

function getMaxDigits(iterable) {
  return Math.max(...[...iterable].map(n => n.toString().length));
}

class Reporter {
  constructor({ sortType }) {
    this._sortType = sortType;
    this._errors = new Map();
    this._suggestedPlugins = new Set();
    this._components = new Map();
    this._componentProps = new Map();
  }

  _sumValues(map) {
    return Array.from(map.values()).reduce((total, count) => total + count, 0);
  }

  _sortMapHelper(map) {
    const entries = Array.from(map.entries());
    const sortTypes = {
      usage: (a, b) => {
        return b[1] - a[1];
      },
      alphabetical: (a, b) => {
        if (b[0] < a[0]) {
          return 1;
        }
        if (b[0] > a[0]) {
          return -1;
        }
        return 0;
      }
    };
    entries.sort(sortTypes[this._sortType]);
    return new Map(entries);
  }

  addParseError(filename, error) {
    this._errors.set(filename, error);
    for (const plugin of error.missingPlugin || []) {
      this._suggestedPlugins.add(plugin);
    }
  }

  addComponent(componentName) {
    this._components.set(
      componentName,
      (this._components.get(componentName) || 0) + 1
    );
  }

  addProp({ componentName, propName, propCode, startLoc }) {
    const props = this._componentProps.get(componentName) || new Map();
    const prop = props.get(propName) || { usage: 0, lines: [] };
    prop.usage++;
    prop.lines.push({ propCode, startLoc });
    props.set(propName, prop);
    this._componentProps.set(componentName, props);
  }

  reportErrors() {
    const errorsCount = this._errors.size;
    if (errorsCount) {
      printer.print(
        "\n" + errorsCount,
        "parse",
        errorsCount === 1 ? "error" : "errors"
      );
      for (const [filename, error] of this._errors) {
        const { loc, message } = error;
        const { line, column } = loc;
        printer.print(
          `  ${filename}:${line}:${column}`,
          printer.styleError(message)
        );
      }
      if (this._suggestedPlugins.size) {
        printer.print("Try adding at least one of the following options:");
        for (const plugin of this._suggestedPlugins) {
          printer.print("  --add-babel-plugin", plugin);
        }
      }
    }
  }

  reportComponentUsage() {
    const totalComponentsCount = this._components.size;
    if (totalComponentsCount === 0) {
      return;
    }
    const totalComponentUsageCount = this._sumValues(this._components);
    printer.print(
      printer.styleHeading(
        `${totalComponentsCount} components used ${totalComponentUsageCount} times:`
      )
    );
    const pairs = this._sortMapHelper(this._components);
    const maxDigits = getMaxDigits(pairs.values());
    for (const [componentName, count] of pairs) {
      printer.print(
        "  " + printer.styleNumber(count.toString().padStart(maxDigits)),
        "  " + printer.textMeter(totalComponentUsageCount, count),
        "  " + printer.styleComponentName(componentName)
      );
    }
  }

  reportPropUsage() {
    const sorted = this._sortMapHelper(this._components);
    for (const [componentName] of sorted) {
      const componentUsage = this._components.get(componentName);
      printer.print(
        printer.styleHeading(
          `${printer.styleComponentName(
            componentName
          )} was used ${componentUsage} ${
            componentUsage === 1 ? "time" : "times"
          } with the following prop usage:`
        )
      );
      const pairs = this._sortMapHelper(
        new Map(
          [...(this._componentProps.get(componentName) || new Map())].map(x => {
            x[1] = x[1].usage;
            return x;
          })
        )
      );
      const maxDigits = getMaxDigits(pairs.values());
      for (const [propName, usage] of pairs) {
        printer.print(
          "  " + printer.styleNumber(usage.toString().padStart(maxDigits)),
          "  " + printer.textMeter(componentUsage, usage),
          "  " + printer.stylePropName(propName)
        );
      }
    }
    printer.print(`
Want to see where the className prop was used on the <div> component?

  jsx-info --report lines --prop className div
`);
  }

  reportLinesUsage() {
    printer.print("\nTODO: lines report");
  }
}

module.exports = Reporter;
