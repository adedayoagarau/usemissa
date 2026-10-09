import assert from "node:assert/strict";
import { test } from "node:test";
import { readAloudChunks } from "./writing-read-aloud-chunks.ts";

test("read aloud skips blank text and keeps short passages intact", () => {
  assert.deepEqual(readAloudChunks(" \n ", 4_000), []);
  assert.deepEqual(readAloudChunks("  A short draft.\nA second line.  ", 4_000), ["A short draft.\nA second line."]);
});

test("long passages remain bounded without dropping words", () => {
  const text = Array.from({ length: 3_000 }, (_, i) => `word${i}`).join(" ");
  const chunks = readAloudChunks(text, 4_000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length > 0 && chunk.length <= 4_000));
  assert.equal(chunks.join(" "), text);
});

test("unbroken text and surrogate pairs survive chunk boundaries", () => {
  const text = `${"x".repeat(3_999)}😀${"y".repeat(5_000)}`;
  const chunks = readAloudChunks(text, 4_000);
  assert.equal(chunks.join(""), text);
  assert.ok(chunks.every((chunk) => chunk.length <= 4_000));
  assert.ok(chunks.every((chunk) => !/[\uD800-\uDBFF]$/.test(chunk) && !/^[\uDC00-\uDFFF]/.test(chunk)));
});

test("paragraph boundaries take priority when they fit", () => {
  const first = "x".repeat(2_500);
  assert.equal(readAloudChunks(`${first}\n${"y".repeat(3_000)}`, 4_000)[0], first);
});
