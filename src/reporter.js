const printer = require("./printer");

class Reporter {
  /**
   * @param {'alphabatical' | 'usage'} sortType
   */
  constructor(sortType) {
    this._sortType = sortType;
    this._errors = new Map();
    this._suggestedPlugins = new Set();
    this._components = new Map();
    this._componentProps = new Map();

    // bindings
    this.addParseError = this.addParseError.bind(this);
    this.addComponent = this.addComponent.bind(this);
    this.addProp = this.addProp.bind(this);
    this.reportComponentUsage = this.reportComponentUsage.bind(this);
    this.reportPropUsage = this.reportPropUsage.bind(this);
    this.reportErrors = this.reportErrors.bind(this);
  }

  _sumValues(map) {
    return Array.from(map.values()).reduce((total, count) => total + count, 0);
  }

  _sortMap(map) {
    const entries = Array.from(map.entries());
    const sortTypes = {
      usage: (a, b) => b[1] - a[1],
      alphabatical: (a, b) => {
        if (b[0] < a[0]) return 1;
        else if (b[0] > a[0]) return -1;
        else return 0;
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

  addProp(componentName, propName) {
    const props = this._componentProps.get(componentName) || new Map();
    const prevPropUsage = props.get(propName) || 0;
    props.set(propName, prevPropUsage + 1);
    this._componentProps.set(componentName, props);
  }

  reportErrors() {
    const errorsCount = this._errors.size;
    if (errorsCount) {
      printer.print(
        "" + errorsCount,
        "parse",
        errorsCount === 1 ? "error" : "errors"
      );

      for (const [filename, error] of this._errors) {
        const {
          loc: { line, column },
          message
        } = error;
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
    if (!totalComponentsCount) return;
    const totalComponentUsageCount = this._sumValues(this._components);
    printer.print(
      printer.styleHeading(
        `${totalComponentsCount} components used ${totalComponentUsageCount} times:`
      )
    );
    const textMeter = printer.createTextMeter(totalComponentUsageCount);
    for (const [componentName, count] of this._sortMap(this._components)) {
      printer.print(
        "",
        printer.styleNumber(count.toString().padStart(3)),
        "",
        textMeter(count),
        "",
        componentName
      );
    }
  }

  reportPropUsage() {
    for (const [componentName, props] of this._sortMap(this._componentProps)) {
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

      const textMeter = printer.createTextMeter(this._sumValues(props));
      for (const [propName, count] of this._sortMap(props)) {
        printer.print(
          "",
          printer.styleNumber(count.toString().padStart(3)),
          "",
          textMeter(count),
          "",
          printer.stylePropName(propName)
        );
      }
    }
  }
}

module.exports = Reporter;
