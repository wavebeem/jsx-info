import * as path from "path";
import { analyze } from "../src/api";

test("analyze empty directory", async () => {
  const analysis = await analyze({
    directory: path.resolve(__dirname, "../fixtures/empty"),
  });
  expect(analysis).toMatchSnapshot({
    elapsedTime: expect.any(Number),
  });
});

test("analyze basic directory", async () => {
  const analysis = await analyze({
    directory: path.resolve(__dirname, "../fixtures/basic"),
  });
  expect(analysis).toMatchSnapshot({
    elapsedTime: expect.any(Number),
  });
});

test("analyze prop-usage directory", async () => {
  const analysis = await analyze({
    directory: path.resolve(__dirname, "../fixtures/prop-usage"),
    components: ["div"],
    prop: "a",
  });
  expect(analysis).toMatchSnapshot({
    elapsedTime: expect.any(Number),
  });
});
