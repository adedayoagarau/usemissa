import assert from "node:assert/strict";
import { test } from "node:test";
import type { PreSubmitInput } from "./pre-submit-check.ts";
import { wordMeter, writingCallChecks } from "./writing-call.ts";

const call = (overrides: Partial<PreSubmitInput> = {}): PreSubmitInput => ({
  requirements: [{ label: "Three poems", state: "missing", linked: false }],
  blindReview: false,
  names: ["Adaeze Okafor", "Adaeze", "Okafor"],
  materials: [],
  ...overrides,
});

const piece = (text: string, pages = 1) => ({
  id: "entry_1",
  title: "Harmattan",
  text,
  pages,
});

test("a piece is measured against the call's word and page limits", () => {
  const input = call({
    wordLimit: { max: 5, confidence: "confirmed" },
    pageLimit: { max: 2, confidence: "probable" },
  });
  const within = writingCallChecks(input, piece("one two three", 2));
  assert.equal(within.find((c) => c.id === "word-limit")?.status, "passed");
  assert.equal(within.find((c) => c.id === "page-limit")?.status, "passed");
  assert.match(
    within.find((c) => c.id === "page-limit")!.detail,
    /confirm it in the guidelines/u,
  );

  const over = writingCallChecks(input, piece("a b c d e f g", 3));
  const words = over.find((c) => c.id === "word-limit")!;
  assert.equal(words.status, "attention");
  assert.match(words.detail, /7 words, 2 over/u);
  assert.equal(over.find((c) => c.id === "page-limit")?.status, "attention");
});

test("a call without limits checks none", () => {
  const checks = writingCallChecks(call(), piece("words"));
  assert.deepEqual(
    checks.map((check) => check.id),
    ["materials"],
  );
});

test("a name in a piece read blind needs attention", () => {
  const blind = call({ blindReview: true });
  const named = writingCallChecks(
    blind,
    piece("A poem by Adaeze Okafor about rain."),
  );
  assert.equal(named.find((c) => c.id === "anonymity")?.status, "attention");
  const clean = writingCallChecks(blind, piece("A poem about rain."));
  assert.equal(clean.find((c) => c.id === "anonymity")?.status, "passed");
  assert.equal(
    writingCallChecks(call(), piece("Adaeze Okafor")).find(
      (c) => c.id === "anonymity",
    ),
    undefined,
    "no name check when the call doesn't read blind",
  );
});

test("the footer meter shows words against the limit", () => {
  assert.equal(wordMeter(null, 10), null);
  assert.equal(wordMeter(call(), 10), null);
  const input = call({ wordLimit: { max: 3000, confidence: "confirmed" } });
  assert.deepEqual(wordMeter(input, 1240), {
    label: "1,240 / 3,000 words",
    over: false,
  });
  assert.equal(wordMeter(input, 3001)?.over, true);
});
