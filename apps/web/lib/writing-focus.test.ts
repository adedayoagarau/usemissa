import assert from "node:assert/strict";
import { test } from "node:test";
import { sentenceAt } from "./writing-focus.ts";

test("the sentence in hand is found by Unicode's rules", () => {
  const text = "The rain came early. It stayed. Nobody minded.";
  const sentence = (offset: number) => {
    const [start, end] = sentenceAt(text, offset);
    return text.slice(start, end);
  };
  assert.equal(sentence(0), "The rain came early. ");
  assert.equal(sentence(23), "It stayed. ");
  assert.equal(sentence(text.length), "Nobody minded.");
  assert.deepEqual(sentenceAt("", 0), [0, 0]);
});
