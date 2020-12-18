import * as path from "path";
import { analyze } from "../src/api";

test("analyze empty directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/empty");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory,
    elapsedTime: expect.any(Number),
  });
});

test("analyze basic directory with absolute paths", async () => {
  const directory = path.resolve(__dirname, "../fixtures/basic");
  const analysis = await analyze({ directory });
  expect(analysis.filenames).toMatchObject([
    path.resolve(directory, "main.js"),
  ]);
});

test("analyze basic directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/basic");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory,
    elapsedTime: expect.any(Number),
  });
});

test("analyze ts directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/ts");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory,
    elapsedTime: expect.any(Number),
  });
});

test("analyze error directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/error");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory,
    elapsedTime: expect.any(Number),
  });
});

test("analyze decorators directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/decorators");
  const analysis = await analyze({ directory, relativePaths: true });
  expect(analysis).toMatchSnapshot({
    directory,
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
    directory,
    elapsedTime: expect.any(Number),
  });
});

test("analyze prop-usage directory", async () => {
  const directory = path.resolve(__dirname, "../fixtures/prop-usage");
  const analysis = await analyze({
    directory,
    components: ["div"],
    prop: "a",
    relativePaths: true,
  });
  expect(analysis).toMatchSnapshot({
    directory,
    elapsedTime: expect.any(Number),
  });
});
