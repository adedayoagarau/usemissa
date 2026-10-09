import assert from "node:assert/strict";
import test from "node:test";
import { pieceTarget } from "./writing-piece-actions";
test("piece target clears empty values and rejects lossy or unsafe numeric input", () => {
  assert.equal(pieceTarget(" "), undefined);
  assert.equal(pieceTarget(" 500 "), 500);
  assert.equal(pieceTarget("1000000"), 1000000);
  for (const value of [
    "0",
    "-2",
    "1.2",
    "1e3",
    "500 words",
    "1000001",
    "9007199254740993",
  ])
    assert.equal(pieceTarget(value), null, value);
});
