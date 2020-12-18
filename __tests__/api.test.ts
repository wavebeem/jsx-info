import * as path from "path";
import { Analysis, analyze } from "../src/api";

function clean(analysis: Analysis, dir: string) {
  const { filenames, elapsedTime, ...data } = analysis;
  return {
    ...data,
    elapsedTime: elapsedTime * 0,
    filenames: filenames.map((f) => path.relative(dir, f)),
  };
}

test("analyze empty directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/empty");
  const analysis = await analyze({ directory });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze basic directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/basic");
  const analysis = await analyze({ directory });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze ts directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/ts");
  const analysis = await analyze({ directory });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze error directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/error");
  const analysis = await analyze({ directory });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze decorators directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/decorators");
  const analysis = await analyze({ directory });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze decorators directory with plugin decorators-legacy", async () => {
  const directory = path.resolve(__dirname, "../fixtures/decorators");
  const analysis = await analyze({
    directory,
    babelPlugins: ["decorators-legacy"],
  });
  expect(clean(analysis, directory)).toMatchSnapshot();
});

test("analyze prop-usage directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/prop-usage");
  const analysis = await analyze({
    directory,
    components: ["div"],
    prop: "a",
  });
  expect(clean(analysis, directory)).toMatchSnapshot();
});
