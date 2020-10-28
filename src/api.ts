import fs from "fs";
import globby from "globby";
import parse from "./parse";
import { sleep } from "./sleep";

type SortType = "usage" | "alphabetical";
type ReportType = "usage" | "props" | "lines";
type Filename = string;
type PropName = string;
type ComponentName = string;

interface AnalyzeOptions {
  babelPlugins?: string[];
  components?: string[];
  directory?: string;
  files?: string[];
  gitignore?: boolean;
  ignore?: string[];
  onFile?: (filename: string) => Promise<void>;
  onStart?: () => Promise<void>;
  prop?: string;
  report?: ReportType[];
  sort?: SortType;
}

interface SourceLocation {
  line: number;
  column: number;
}

interface ErrorInfo {
  pos: number;
  loc: SourceLocation;
  missingPlugin: string[];
}

interface LineInfo {
  propCode: string;
  prettyCode: string;
  startLoc: SourceLocation;
  endLoc: SourceLocation;
  filename: Filename;
}

type PropUsage = Record<ComponentName, Record<PropName, number>>;
type LineUsage = Record<ComponentName, Record<PropName, LineInfo[]>>;
type ComponentUsage = Record<ComponentName, number>;

interface Analysis {
  filenames: Filename[];
  componentTotal: number;
  componentUsageTotal: number;
  componentUsage: ComponentUsage;
  propUsage: PropUsage;
  lineUsage: LineUsage;
  errors: Record<Filename, ErrorInfo>;
  suggestedPlugins: string[];
  elapsedTime: number;
}

export async function analyze({
  babelPlugins = [],
  components,
  directory,
  files = ["**/*.{js,jsx,tsx}"],
  gitignore = true,
  ignore = [],
  onFile,
  onStart,
  prop,
  report = ["usage", "props"],
  sort = "usage",
}: AnalyzeOptions): Promise<Analysis> {
  if (!prop && report.includes("lines")) {
    throw new Error("`prop` option required for `lines` report");
  }
  const timeStart = Date.now();
  if (onStart) {
    await onStart();
  }
  const filenames = await globby(files || "**/*.{js,jsx,tsx}", {
    absolute: true,
    onlyFiles: true,
    gitignore,
    ignore,
    cwd: directory || process.cwd(),
  });
  const reporter = new Reporter();
  for (const filename of filenames) {
    if (onFile) {
      await onFile(filename);
    } else {
      await sleep();
    }
    try {
      const code = fs.readFileSync(filename, "utf8");
      parse(code, {
        babelPlugins,
        typescript: filename.endsWith(".tsx") || filename.endsWith(".ts"),
        onlyComponents: components,
        onComponent: (componentName: any) => {
          reporter.addComponent(componentName);
        },
        onProp: ({
          componentName,
          propName,
          propCode,
          startLoc,
          endLoc,
          propValue,
        }: any) => {
          if (prop) {
            let wantPropKey = prop;
            let wantPropValue = undefined;
            if (prop.includes("=")) {
              const index = prop.indexOf("=");
              const key = prop.slice(0, index);
              const val = prop.slice(index + 1);
              wantPropKey = key;
              wantPropValue = val;
            }
            if (propName !== wantPropKey) {
              return;
            }
            if (wantPropValue !== undefined && propValue !== wantPropValue) {
              return;
            }
          }
          const prettyCode = formatPrettyCode(code, startLoc.line, endLoc.line);
          reporter.addProp(componentName, propName, {
            propCode,
            startLoc,
            endLoc,
            prettyCode,
            filename,
          });
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        reporter.addParseError(filename, error);
      } else {
        throw error;
      }
    }
  }
  const elapsedTime = (Date.now() - timeStart) / 1000;
  return {
    filenames,
    componentTotal: reporter.getComponentTotal(),
    componentUsageTotal: reporter.getComponentUsageTotal(),
    componentUsage: reporter.components,
    propUsage: reporter.props,
    lineUsage: reporter.lines,
    errors: reporter.errors,
    suggestedPlugins: reporter.suggestedPlugins,
    elapsedTime: elapsedTime,
  };
}

const linesCache = new Map<string, string[]>();

function getLines(code: string): string[] {
  let lines = linesCache.get(code);
  if (lines) {
    return lines;
  }
  lines = code.split(/\r?\n/);
  linesCache.set(code, lines);
  return lines;
}

function formatPrettyCode(
  code: string,
  startLine: number,
  endLine: number
): string {
  const output: string[] = [];
  const lines = getLines(code);
  // Line numbers should be padded to at least 4 digits for consistency and
  // readability, but let's also let them grow if we have super long files :|
  const maxDigits = Math.max(
    String(startLine).length,
    String(endLine).length,
    4
  );
  for (let lineno = startLine; lineno <= endLine; lineno++) {
    output.push(String(lineno).padStart(maxDigits) + " | " + lines[lineno - 1]);
  }
  return output.join("\n");
}

class Reporter {
  components: ComponentUsage = {};
  props: PropUsage = {};
  lines: LineUsage = {};
  suggestedPlugins: string[] = [];
  errors: Record<Filename, ErrorInfo> = {};

  // TODO: Get the right type for this
  addParseError(filename: Filename, error: any): void {
    this.errors[filename] = error;
    for (const plugin of error.missingPlugin || []) {
      if (!this.suggestedPlugins.includes(plugin)) {
        this.suggestedPlugins.push(plugin);
      }
    }
  }

  addComponent(componentName: ComponentName): void {
    this.components[componentName] = (this.components[componentName] || 0) + 1;
  }

  private _incrementProp(
    componentName: ComponentName,
    propName: PropName
  ): void {
    if (!this.props[componentName]) {
      this.props[componentName] = {};
    }
    const count = this.props[componentName][propName] || 0;
    this.props[componentName][propName] = count + 1;
  }

  private _ensureLines(componentName: ComponentName, propName: PropName): void {
    if (!this.lines[componentName]) {
      this.lines[componentName] = {};
    }
    if (!this.lines[componentName][propName]) {
      this.lines[componentName][propName] = [];
    }
  }

  addProp(componentName: ComponentName, propName: PropName, line: LineInfo) {
    this._incrementProp(componentName, propName);
    this._ensureLines(componentName, propName);
    this.lines[componentName][propName].push(line);
  }

  getComponentTotal(): number {
    return Object.keys(this.components).length;
  }

  getComponentUsageTotal(): number {
    return Object.values(this.components).reduce((a, b) => a + b, 0);
  }
}
