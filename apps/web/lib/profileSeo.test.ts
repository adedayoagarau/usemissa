import assert from "node:assert/strict";
import { test } from "node:test";

import { isThinProfile } from "./profileSeo";

const empty = { summary: null, readingPeriod: null, submissionGuidelinesUrl: null, opportunities: [] };

test("a profile with nothing to use is thin", () => {
  assert.equal(isThinProfile(empty), true);
  assert.equal(isThinProfile({ ...empty, summary: "A short line." }), true);
});

test("an open call, a reading period, guidelines or a real description keep a profile indexed", () => {
  assert.equal(isThinProfile({ ...empty, opportunities: [{ id: "a", title: "Call", organizer: "Org", deadline: null, detailUrl: null, officialWebsite: null, status: "open" }] }), false);
  assert.equal(isThinProfile({ ...empty, readingPeriod: "September to November" }), false);
  assert.equal(isThinProfile({ ...empty, submissionGuidelinesUrl: "https://example.org/submit" }), false);
  assert.equal(isThinProfile({ ...empty, summary: "x".repeat(200) }), false);
});
