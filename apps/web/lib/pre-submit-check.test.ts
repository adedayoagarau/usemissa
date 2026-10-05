import assert from "node:assert/strict";
import test from "node:test";

import { countWords, preSubmitChecks, type PreSubmitInput } from "./pre-submit-check.ts";

const base: PreSubmitInput = { requirements: [], blindReview: false, names: ["Ada Okafor", "Ada", "Okafor"], materials: [] };

test("never reports an unverified check as passed", () => {
  const checks = preSubmitChecks({
    ...base,
    requirements: [{ label: "Manuscript", state: "complete", linked: true }],
    wordLimit: { max: 10, confidence: "probable" },
    pageLimit: { max: 5, confidence: "confirmed" },
    materials: [{ kind: "file", id: "f", title: "Manuscript", fileName: "tides.pdf", mimeType: "application/pdf" }],
  });
  const byId = Object.fromEntries(checks.map((check) => [check.id, check]));
  assert.equal(byId.materials.status, "passed");
  assert.equal(byId["word-limit"].status, "manual");
  assert.match(byId["word-limit"].detail, /confirm it in the guidelines/);
  assert.equal(byId["page-limit"].status, "manual");
  assert.equal(byId["file-types"].status, "manual");
  assert.equal(byId.anonymity, undefined, "anonymity is omitted when the call is not blind");
});

test("flags missing materials, text over the limit, and a name in a blind call", () => {
  const checks = preSubmitChecks({
    ...base,
    blindReview: true,
    requirements: [
      { label: "Artist statement", state: "missing", linked: false },
      { label: "Bio", state: "complete", linked: false },
    ],
    wordLimit: { max: 5, confidence: "confirmed" },
    materials: [
      { kind: "answer", id: "a", title: "Statement", text: "My river poems began in Ibadan long ago." },
      { kind: "work", id: "w", title: "Tides by Ada Okafor" },
    ],
  });
  const byId = Object.fromEntries(checks.map((check) => [check.id, check]));
  assert.equal(byId.materials.status, "attention");
  assert.deepEqual(byId.materials.items, ["Artist statement"]);
  assert.equal(byId["word-limit"].status, "attention");
  assert.deepEqual(byId["word-limit"].items, ["Statement: 8 words"]);
  assert.equal(byId.anonymity.status, "attention");
  assert.deepEqual(byId.anonymity.items, ["Tides by Ada Okafor: your name is in the title"]);
});

test("name matching respects word boundaries and short names", () => {
  const checks = preSubmitChecks({ ...base, names: ["Al", "Ann"], blindReview: true, materials: [{ kind: "answer", id: "a", title: "Annual report", text: "Channel planning" }] });
  assert.equal(checks.find((check) => check.id === "anonymity")?.status, "passed");
  assert.equal(countWords("  one two\nthree "), 3);
});
