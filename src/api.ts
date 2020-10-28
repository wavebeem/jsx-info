import { ParserPlugin } from "@babel/parser";
import fs from "fs";
import globby from "globby";
import { parse } from "./parse";
import { sleep } from "./sleep";

export type ReportType = "usage" | "props" | "lines";

export interface AnalyzeOptions {
  babelPlugins?: ParserPlugin[];
  components?: string[];
  directory?: string;
  files?: string[];
  gitignore?: boolean;
  ignore?: string[];
  onFile?: (filename: string) => Promise<void>;
  onStart?: () => Promise<void>;
  prop?: string;
  report?: ReportType;
}

export interface SourceLocation {
  line: number;
  column: number;
}

export interface ErrorInfo {
  message: string;
  pos: number;
  loc: SourceLocation;
  missingPlugin: string[];
}

export interface LineInfo {
  propCode: string;
  prettyCode: string;
  startLoc: SourceLocation;
  endLoc: SourceLocation;
  filename: string;
}

export type PropUsage = Record<string, Record<string, number>>;
export type LineUsage = Record<string, Record<string, LineInfo[]>>;
export type ComponentUsage = Record<string, number>;

export interface Analysis {
  filenames: string[];
  componentTotal: number;
  componentUsageTotal: number;
  componentUsage: ComponentUsage;
  propUsage: PropUsage;
  lineUsage: LineUsage;
  errors: Record<string, ErrorInfo>;
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
  report,
}: AnalyzeOptions): Promise<Analysis> {
  if (!prop && report === "lines") {
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
  errors: Record<string, ErrorInfo> = {};

  // TODO: Does Babel expose the actual error type for us?
  addParseError(filename: string, error: any): void {
    this.errors[filename] = {
      message: error.message,
      pos: error.pos,
      loc: error.loc,
      missingPlugin: error.missingPlugin,
    };
    for (const plugin of error.missingPlugin || []) {
      if (!this.suggestedPlugins.includes(plugin)) {
        this.suggestedPlugins.push(plugin);
      }
    }
  }

  addComponent(componentName: string): void {
    this.components[componentName] = (this.components[componentName] || 0) + 1;
  }

  private _incrementProp(componentName: string, propName: string): void {
    if (!this.props[componentName]) {
      this.props[componentName] = {};
    }
    const count = this.props[componentName][propName] || 0;
    this.props[componentName][propName] = count + 1;
  }

  private _ensureLines(componentName: string, propName: string): void {
    if (!this.lines[componentName]) {
      this.lines[componentName] = {};
    }
    if (!this.lines[componentName][propName]) {
      this.lines[componentName][propName] = [];
    }
  }

  addProp(componentName: string, propName: string, line: LineInfo) {
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
