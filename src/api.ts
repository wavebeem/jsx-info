import codeSource from "./code-source";
import { formatPrettyCode } from "./formatPrettyCode";
import parse from "./parse";
import Reporter from "./reporter";
import { sleep } from "./sleep";

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
  report?: ("usage" | "props" | "lines")[];
  sort?: "usage" | "alphabetical";
}

type Filename = string;
type PropName = string;
type ComponentName = string;

interface SourceLocation {
  line: number;
  column: number;
}

interface ErrorInfo {
  pos: number;
  loc: SourceLocation;
  missingPlugin: string[];
}

interface LineUsage {
  usage: number;
  lines: LineInfo[];
}

interface LineInfo {
  prettyCode: string;
  startLoc: SourceLocation;
  endLoc: SourceLocation;
  filename: Filename;
}

interface Analysis {
  filenames: Filename[];
  totals: {
    componentTotal: number;
    componentUsageTotal: number;
  };
  componentUsage: Record<ComponentName, number>;
  propUsage: Record<ComponentName, Record<PropName, number>>;
  lineUsage: Record<ComponentName, Record<PropName, LineUsage>>;
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
  const filenames = await codeSource.searchForFiles({
    patterns: files,
    gitignore,
    directory,
    ignore,
  });
  const reporter = new Reporter({ sortType: sort });
  for (const filename of filenames) {
    if (onFile) {
      await onFile(filename);
    } else {
      await sleep();
    }
    try {
      const code = codeSource.codeFromFile(filename);
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
    totals: reporter.getTotals(),
    componentUsage: reporter.getComponentUsage(),
    propUsage: reporter.getPropUsage() as any,
    lineUsage: reporter.getLineUsage(),
    errors: reporter.getErrors(),
    suggestedPlugins: reporter.getSuggestedPlugins(),
    elapsedTime: elapsedTime,
  };
}
