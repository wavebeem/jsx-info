import * as path from "path";
import { analyze } from "../src/api";

test("analyze empty directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/empty");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze basic directory with absolute paths", async () => {
  const directory = path.resolve(__dirname, "../fixtures/basic");
  const analysis = await analyze({ directory });
  expect(
    analysis.filenames.map((f) => path.resolve(directory, f))
  ).toMatchObject([path.resolve(directory, "main.js")]);
});

test("analyze line-report directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/line-report");
  const analysis = await analyze({
    directory,
    relativePaths: true,
    components: ["div"],
    prop: "id",
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze line-report directory [style]", async () => {
  const directory = path.resolve(__dirname, "../fixtures/line-report");
  const analysis = await analyze({
    directory,
    relativePaths: true,
    components: ["div"],
    prop: "style",
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze line-report directory [none]", async () => {
  const directory = path.resolve(__dirname, "../fixtures/line-report");
  const analysis = await analyze({
    directory,
    relativePaths: true,
    components: ["div"],
    prop: "none",
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze basic directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/basic");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze ts directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/ts");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze error directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/error");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze decorators directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/decorators");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze decorators directory with plugin decorators-legacy", async () => {
  const directory = path.resolve(__dirname, "../fixtures/decorators");
  const analysis = await analyze({
    directory,
    babelPlugins: ["decorators-legacy"],
    relativePaths: true,
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze prop-usage directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/prop-usage");
  const analysis = await analyze({
    directory,
    files: ["main.js"],
    components: ["div"],
    prop: "a",
    relativePaths: true,
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});

test("analyze multiple prop types in prop-usage directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/prop-usage");
  const analysis = await analyze({
    directory,
    files: ["multiplePropTypes.js"],
    components: ["div"],
    prop: "value",
    relativePaths: true,
  });
  expect(analysis).toMatchSnapshot({
    directory: expect.any(String),
    elapsedTime: expect.any(Number),
  });
});
