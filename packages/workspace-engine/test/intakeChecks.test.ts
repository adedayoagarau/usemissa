import assert from "node:assert/strict";
import test from "node:test";
import { intakeFlags, type IntakeSubmission } from "../src/index.js";

const sub = (id: string, submitter: string, works: IntakeSubmission["works"], extra: Partial<IntakeSubmission> = {}): IntakeSubmission => ({ id, submitterAccountId: submitter, status: "submitted", submittedAt: `2026-10-0${id.slice(-1)}T10:00:00.000Z`, works, ...extra });

test("repeat submitters, shared titles and shared files are flagged, never removed", () => {
  const flags = intakeFlags([
    sub("s1", "rosa", [{ title: "Saltwater", fileUrls: ["blob://a"] }]),
    sub("s2", "rosa", [{ title: "Night bus" }]),
    sub("s3", "ivo", [{ title: "SALTWATER!", fileUrls: ["blob://a"] }]),
    sub("s4", "zed", [{ title: "Notes" }], { status: "withdrawn" }),
  ]);
  assert.equal(flags.has("s4"), false, "withdrawn submissions are ignored");
  assert.deepEqual(flags.get("s1")!.map((flag) => flag.code).sort(), ["duplicate-file", "duplicate-title", "repeat-submitter"]);
  assert.match(flags.get("s2")!.find((flag) => flag.code === "repeat-submitter")!.message, /number 2/);
  assert.deepEqual(flags.get("s3")!.find((flag) => flag.code === "duplicate-title")!.relatedSubmissionIds, ["s1"]);
});

test("a person's own repeated title is not a duplicate-title flag, and limits can allow repeats", () => {
  const flags = intakeFlags([sub("s1", "rosa", [{ title: "Saltwater" }]), sub("s2", "rosa", [{ title: "Saltwater" }])], { maxSubmissionsPerSubmitter: 2 });
  assert.deepEqual(flags.get("s1"), []);
});

test("eligibility rules flag too many Works, unaccepted categories and missing files", () => {
  const flags = intakeFlags([
    sub("s1", "rosa", [{ title: "One" }, { title: "Two" }, { title: "Three" }], { category: "Fiction" }),
    sub("s2", "ivo", [{ title: "Four", fileUrl: "blob://x" }], { category: "poetry" }),
  ], { maxWorks: 2, allowedCategories: ["Poetry"], requireFiles: true });
  assert.deepEqual(flags.get("s1")!.map((flag) => flag.code).sort(), ["category-not-accepted", "missing-file", "too-many-works"]);
  assert.match(flags.get("s1")!.find((flag) => flag.code === "missing-file")!.message, /3 Works have no file/);
  assert.deepEqual(flags.get("s2"), [], "category match ignores case");
});
