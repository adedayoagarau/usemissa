import assert from "node:assert/strict";
import { test } from "node:test";
import { quotedRanges, sentenceAt } from "./writing-focus.ts";

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

test("dialogue is found by its quotation marks alone", () => {
  const text = '“Go,” she said. "Now." It wasn’t late. ‘Fine,’ he said. «Oui»';
  assert.deepEqual(
    quotedRanges(text).map(([start, end]) => text.slice(start, end)),
    ["“Go,”", '"Now."', "‘Fine,’", "«Oui»"],
  );
  // A quotation left open runs to the end of the paragraph, as in prose.
  assert.deepEqual(quotedRanges("“And then"), [[0, 9]]);
});
