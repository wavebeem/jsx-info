import { parse as babelParse, ParserPlugin } from "@babel/parser";
import traverse from "@babel/traverse";
import { JSXElement, Node } from "@babel/types";
import fs from "fs";
import globby from "globby";
import path from "path";
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
  /** Use relative paths instead of absolute paths */
  relativePaths?: boolean;
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
  propValue: string | symbol;
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
  directory: string;
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
  directory = process.cwd(),
  files = ["**/*.{js,jsx,tsx}"],
  gitignore = true,
  ignore = [],
  onFile,
  prop = "",
  relativePaths = false,
}: AnalyzeOptions): Promise<Analysis> {
  function processFilename(filename: string): string {
    if (relativePaths) {
      return filename;
    }
    return path.resolve(directory, filename);
  }
  const searchProp = prop;
  const timeStart = Date.now();
  const filenames = await globby(files || "**/*.{js,jsx,tsx}", {
    absolute: !relativePaths,
    onlyFiles: true,
    gitignore,
    ignore,
    cwd: directory,
  });
  const reporter = new Reporter();
  for (const filename of filenames) {
    if (onFile) {
      await onFile(processFilename(filename));
    } else {
      await sleep();
    }
    try {
      const code = fs.readFileSync(path.resolve(directory, filename), "utf8");
      parse(code, {
        babelPlugins,
        typescript: filename.endsWith(".tsx") || filename.endsWith(".ts"),
        onlyComponents: components,
        onComponent: ({ componentName, node }) => {
          reporter.addComponent(componentName);
          const props = node.openingElement.attributes.map((propNode) => {
            if (!propNode.loc) {
              throw new Error(`JSXElement propNode.loc is missing`);
            }
            return {
              componentName,
              propName: createProp(propNode),
              propCode: code.slice(propNode.start || 0, propNode.end || -1),
              startLoc: propNode.loc.start,
              endLoc: propNode.loc.end,
              propValue:
                propNode.type === "JSXAttribute"
                  ? formatPropValue(propNode.value)
                  : formatPropValue(null),
            };
          });
          if (searchProp.startsWith("!")) {
            const wantProp = searchProp.slice(1);
            if (props.every((p) => p.propName !== wantProp)) {
              if (!node.loc) {
                throw new Error(`JSXElement propNode.loc is missing`);
              }
              reporter.addProp(componentName, searchProp, {
                propCode: code.slice(node.start || 0, node.end || -1),
                propValue: formatPropValue(null),
                startLoc: node.loc.start,
                endLoc: node.loc.end,
                prettyCode: formatPrettyCode(
                  code,
                  node.loc.start.line,
                  node.loc.end.line
                ),
                filename: processFilename(filename),
              });
            }
          } else {
            for (const prop of props) {
              let wantPropKey = searchProp;
              let match = (_value: string | symbol): boolean => true;
              if (searchProp.includes("!=")) {
                const index = searchProp.indexOf("!=");
                const key = searchProp.slice(0, index);
                const val = searchProp.slice(index + 2);
                wantPropKey = key;
                match = (value) => value !== val;
              } else if (searchProp.includes("=")) {
                const index = searchProp.indexOf("=");
                const key = searchProp.slice(0, index);
                const val = searchProp.slice(index + 1);
                wantPropKey = key;
                match = (value) => value === val;
              }
              if (wantPropKey && prop.propName !== wantPropKey) {
                continue;
              }
              if (!match(prop.propValue)) {
                continue;
              }
              if (
                (!wantPropKey || prop.propName === wantPropKey) &&
                match(prop.propValue)
              ) {
                reporter.addProp(componentName, prop.propName, {
                  propCode: prop.propCode,
                  propValue: prop.propValue,
                  startLoc: prop.startLoc,
                  endLoc: prop.endLoc,
                  prettyCode: formatPrettyCode(
                    code,
                    prop.startLoc.line,
                    prop.endLoc.line
                  ),
                  filename: processFilename(filename),
                });
              }
            }
          }
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        reporter.addParseError(processFilename(filename), error);
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
    directory,
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

const EXPRESSION = Symbol("formatPropValue.EXPRESSION");

function formatPropValue(value: Node | null): string | symbol {
  if (value === null) {
    return "true";
  }
  if (!value) {
    return EXPRESSION;
  }
  switch (value.type) {
    // TODO: Should we interpret anything else here?
    case "StringLiteral":
      return value.value;
    case "JSXExpressionContainer":
      return formatPropValue(value.expression);
    case "NumericLiteral":
    case "BooleanLiteral":
      return String(value.value);
    default:
      return EXPRESSION;
  }
}

function getAttributeName(attributeNode: Node): string {
  switch (attributeNode.type) {
    case "JSXIdentifier":
      return attributeNode.name;
    case "JSXNamespacedName":
      return attributeNode.name.name;
    case "JSXAttribute":
      return getAttributeName(attributeNode.name);
    case "JSXSpreadAttribute":
      return "{...}";
    default:
      throw new Error(`unexpected node type: ${attributeNode.type}`);
  }
}

function createProp(attributeNode: Node) {
  return getAttributeName(attributeNode);
}

function getDottedName(nameNode: Node): string {
  switch (nameNode.type) {
    case "JSXMemberExpression":
      return [nameNode.object, nameNode.property].map(getDottedName).join(".");
    case "JSXIdentifier":
      return nameNode.name;
    default:
      throw new Error(`unexpected node type: ${nameNode.type}`);
  }
}

function createComponent(componentNode: JSXElement) {
  return getDottedName(componentNode.openingElement.name);
}

interface ParseOptions {
  typescript?: boolean;
  babelPlugins?: ParserPlugin[];
  onlyComponents?: string[];
  onComponent?: (options: { componentName: string; node: JSXElement }) => void;
}

function parse(code: string, options: ParseOptions = {}): void {
  const {
    typescript = false,
    babelPlugins = [],
    onlyComponents = [],
    onComponent = () => {},
  } = options;
  function doReportComponent(component: string) {
    if (onlyComponents.length === 0) {
      return true;
    }
    return onlyComponents.indexOf(component) !== -1;
  }
  const ast = babelParse(code, {
    sourceType: "unambiguous",
    allowReturnOutsideFunction: true,
    plugins: [
      typescript ? "typescript" : "flow",
      "jsx",
      "dynamicImport",
      "classProperties",
      "objectRestSpread",
      ...babelPlugins,
    ],
  });
  traverse(ast, {
    JSXElement(path) {
      const node = path.node;
      const componentName = createComponent(node);
      if (doReportComponent(componentName)) {
        onComponent({ componentName, node });
      }
    },
  });
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
