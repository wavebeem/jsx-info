export class Reporter {
  constructor({ sortType }) {
    this._sortType = sortType;
    this._errors = {};
    this._suggestedPlugins = [];
    this._components = {};
    this._componentProps = {};
  }

  _sumValues(map) {
    return Array.from(Object.values(map)).reduce(
      (total, count) => total + count,
      0
    );
  }

  _sortObjHelper(map) {
    const entries = Array.from(Object.entries(map));
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
      },
    };
    entries.sort(sortTypes[this._sortType]);
    return Object.fromEntries(entries);
  }

  addParseError(filename, error) {
    this._errors[filename] = error;
    for (const plugin of error.missingPlugin || []) {
      if (!this._suggestedPlugins.includes(plugin)) {
        this._suggestedPlugins.push(plugin);
      }
    }
  }

  addComponent(componentName) {
    this._components[componentName] =
      (this._components[componentName] || 0) + 1;
  }

  addProp({
    componentName,
    propName,
    propCode,
    prettyCode,
    startLoc,
    endLoc,
    filename,
  }) {
    const props = this._componentProps[componentName] || {};
    const prop = props[propName] || { usage: 0, lines: [] };
    prop.usage++;
    prop.lines.push({ propCode, prettyCode, startLoc, endLoc, filename });
    props[propName] = prop;
    this._componentProps[componentName] = props;
  }

  getErrors() {
    return this._errors;
  }

  getSuggestedPlugins() {
    return this._suggestedPlugins;
  }

  getTotals() {
    const componentTotal = Object.keys(this._components).length;
    const componentUsageTotal = this._sumValues(this._components);
    return { componentTotal, componentUsageTotal };
  }

  getComponentUsage() {
    return this._sortObjHelper(this._components);
  }

  getSortedComponents() {
    return this._sortObjHelper(this._components);
  }

  getPropUsage() {
    const componentObj = {};
    for (const componentName of Object.keys(this.getSortedComponents())) {
      const propsObj = {};
      const pairs = this._sortObjHelper(
        Object.entries(this._componentProps[componentName] || {}).map(
          ([key, value]) => {
            return [key, value.usage];
          }
        )
      );
      for (const [key, val] of Object.values(pairs)) {
        propsObj[key] = val;
      }
      componentObj[componentName] = propsObj;
    }
    return componentObj;
  }

  getLineUsage() {
    return this._componentProps;
  }
}
