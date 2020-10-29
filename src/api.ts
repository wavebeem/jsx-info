import { ParserPlugin } from "@babel/parser";
import fs from "fs";
import globby from "globby";
import { parse } from "./parse";
import { sleep } from "./sleep";

/** Options passed to `analyze` */
export interface AnalyzeOptions {
  /** List of Babel plugins needed to parse your code */
  babelPlugins?: ParserPlugin[];
  /** Which JSX components should we scan */
  components?: string[];
  /** Which directory should we scan (defaults to current working directory) */
  directory?: string;
  /** Array of file globs (defaults to all .js, .jsx, .tsx files) */
  files?: string[];
  /** Ignore files specified in the .gitignore file (defaults to true) */
  gitignore?: boolean;
  /** Array of file globs to ignore */
  ignore?: string[];
  /** Async callback called before scanning each new file */
  onFile?: (filename: string) => Promise<void>;
  /** Which JSX prop should we scan for (e.g. `id` or `variant=primary`) */
  prop?: string;
}

/** A location in source code */
export interface SourceLocation {
  line: number;
  column: number;
}

/** Information about a parse error */
export interface ErrorInfo {
  message: string;
  pos: number;
  loc: SourceLocation;
  missingPlugin: string[];
}

/** Information about a line where a prop was used */
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

/**
 * Return a Promise with the JSX usage analysis of a project
 *
 * This function can easily return several megabytes of data. Parsing every
 * single JS/TS file in a project can take a while. Please be patient. The
 * `onFile` callbacks are async. Parsing each file is not an async action and
 * may block for a couple seconds if the file is large. You can insert a "sleep"
 * command into the `onFile` callback if you would like to return control
 * briefly.
 */
export async function analyze({
  babelPlugins = [],
  components,
  directory,
  files = ["**/*.{js,jsx,tsx}"],
  gitignore = true,
  ignore = [],
  onFile,
  prop,
}: AnalyzeOptions): Promise<Analysis> {
  const timeStart = Date.now();
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

////////////////////////////////////////////////////////////////////////////////
//
// Implementation details below
//
////////////////////////////////////////////////////////////////////////////////

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
