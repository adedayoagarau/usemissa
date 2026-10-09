import assert from "node:assert/strict";
import test from "node:test";
import { parseToolData, toolLoadIsCurrent } from "./writing-tool-data";
test("typed preferences reject arbitrary account properties and oversized words", () => {
  assert.throws(() =>
    parseToolData("checks", {
      dialect: 0,
      disabledRules: [],
      ignoredHashes: [],
      otherSecret: "x",
    }),
  );
  assert.throws(() =>
    parseToolData("dictionary", { words: ["x".repeat(101)] }),
  );
  assert.throws(() =>
    parseToolData("revisions", {
      version: 1,
      suggestions: [],
      comments: [],
      cuttings: [],
      extra: "x",
    }),
  );
});
test("overlapping loads cannot apply an older account copy after another load saves", () => {
  assert.equal(toolLoadIsCurrent(1, 2, 8, null), false);
  assert.equal(toolLoadIsCurrent(2, 2, 8, 9), false);
  assert.equal(toolLoadIsCurrent(2, 2, 9, 9), true);
  assert.equal(toolLoadIsCurrent(3, 3, 10, 9), true);
});
