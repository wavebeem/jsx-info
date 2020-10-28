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

interface ComponentProp {
  componentName: ComponentName;
  propName: PropName;
  propCode: string;
  prettyCode: string;
  startLoc: SourceLocation;
  endLoc: SourceLocation;
  filename: Filename;
  usage: number;
  lines: LineInfo[];
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

interface LinePropUsage {
  usage: number;
  lines: LineInfo[];
}

interface LineInfo {
  propCode: string;
  prettyCode: string;
  startLoc: SourceLocation;
  endLoc: SourceLocation;
  filename: Filename;
}

type PropUsage = Record<ComponentName, Record<PropName, number>>;
type LineUsage = Record<ComponentName, Record<PropName, LinePropUsage>>;
type ComponentUsage = Record<ComponentName, number>;

interface Analysis {
  filenames: Filename[];
  componentTotal: number;
  componentUsageTotal: number;
  componentUsage: ComponentUsage;
  // propUsage: PropUsage;
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
          reporter.addProp({
            componentName,
            propName,
            propCode,
            startLoc,
            endLoc,
            prettyCode,
            filename,
            usage: 0,
            lines: [],
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
    lineUsage: reporter.componentProps,
    errors: reporter.errors,
    suggestedPlugins: reporter.suggestedPlugins,
    elapsedTime: elapsedTime,
  };
}

const linesCache = new Map();

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
  componentProps: Record<string, Record<string, ComponentProp>> = {};
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

  addProp(newProp: ComponentProp) {
    const props = this.componentProps[newProp.componentName] || {};
    const prop = props[newProp.propName] || newProp;
    prop.usage++;
    prop.lines.push({
      propCode: newProp.propCode,
      prettyCode: newProp.prettyCode,
      startLoc: newProp.startLoc,
      endLoc: newProp.endLoc,
      filename: newProp.filename,
    });
    props[newProp.propName] = prop;
    this.componentProps[newProp.componentName] = props;
  }

  getComponentTotal(): number {
    return Object.keys(this.components).length;
  }

  getComponentUsageTotal(): number {
    return Object.values(this.components).reduce((a, b) => a + b, 0);
  }
}

(async function() {
  try {
    const result = await analyze({});
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(err);
  }
})();
