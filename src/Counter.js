class Counter {
  constructor(options) {
    this._allComponentsCount = 0;
    this._componentCounts = new Map();
    this._componentPropCounts = new Map();
    this._componentChildrenCounts = new Map();
    this._errors = [];
    this._suggestedPlugins = new Set();
    this._sortType = options.sort;
  }

  addParseError({ filename, error }) {
    this._errors.push({ filename, error });
    for (const plugin of error.missingPlugin || []) {
      this._suggestedPlugins.add(plugin);
    }
  }

  incrementComponentUsage(component) {
    const prev = this._componentCounts.get(component) || 0;
    if (!prev) {
      this._componentPropCounts.set(component, new Map());
    }
    this._allComponentsCount++;
    this._componentCounts.set(component, prev + 1);
  }

  incrementComponentPropUsage(component, prop) {
    const map = this._componentPropCounts.get(component);
    const prev = map.get(prop) || 0;
    map.set(prop, prev + 1);
  }

  incrementComponentChildrenUsage(component, childrenNames) {
    if (!this._componentChildrenCounts.has(component)) {
      this._componentChildrenCounts.set(component, new Map());
    }
    const childrenCounts = this._componentChildrenCounts.get(component);
    childrenNames.forEach(child => {
      const prev = childrenCounts.get(child) || 0;
      childrenCounts.set(child, prev + 1);
    });
  }

  getProblems() {
    return {
      errors: [...this._errors],
      suggestedPlugins: [...this._suggestedPlugins]
    };
  }

  getComponentsList() {
    return this.getSortedMap(this._componentCounts).map(x => x.name);
  }

  getAllComponentsReport() {
    const total = this._allComponentsCount;
    const counts = this.getSortedMap(this._componentCounts);
    return { total, counts };
  }

  getComponentChildrenUsageList() {
    return [...this._componentChildrenCounts].sort(
      ([aName, aChildren], [bName, bChildren]) => {
        const sortCount = bChildren.size - aChildren.size;
        const sortName = bName < aName ? -1 : bName > aName ? 1 : 0;
        if (this._sortType === "usage") {
          return sortCount || sortName || 0;
        } else if (this._sortType === "alphabetical") {
          return sortName || sortCount || 0;
        }
        return 0;
      }
    );
  }

  getSortedMap(map) {
    return [...map]
      .map(([name, count]) => {
        return { name, count };
      })
      .sort((a, b) => {
        const sortCount = b.count - a.count;
        const sortName = b.name < a.name ? -1 : b.name > a.name ? 1 : 0;

        if (this._sortType === "usage") {
          return sortCount || sortName || 0;
        } else if (this._sortType === "alphabetical") {
          return sortName || sortCount || 0;
        }
        return 0;
      });
  }

  getComponentReport(component) {
    const componentCount = this._componentCounts.get(component);
    const propCounts = this.getSortedMap(
      this._componentPropCounts.get(component)
    );
    return { componentCount, propCounts };
  }
}

module.exports = Counter;
