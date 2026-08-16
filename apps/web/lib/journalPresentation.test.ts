import assert from "node:assert/strict";
import test from "node:test";
import { monogramFor, submissionWindowStatus } from "./journalPresentation";

test("monograms are deterministic and derived from the publication name", () => {
  const first = monogramFor("The Paris Review");
  const second = monogramFor("The Paris Review");

  assert.equal(first.letters, "TP");
  assert.deepEqual(first, second);
  assert.notEqual(first.tone, "");
});

test("submission windows expose an actionable status", () => {
  assert.deepEqual(submissionWindowStatus("Rolling"), {
    kind: "open",
    label: "Open now",
    detail: "Rolling",
  });
  assert.equal(
    submissionWindowStatus("Feb 15 to Mar 30", new Date("2026-08-15T12:00:00Z"))
      .detail,
    "Opens Feb 15",
  );
  assert.equal(
    submissionWindowStatus("Feb 15 to Mar 30", new Date("2026-03-01T12:00:00Z"))
      .label,
    "Open now",
  );
  assert.equal(submissionWindowStatus("Not listed").kind, "unknown");
});
