import assert from "node:assert/strict";
import test from "node:test";

import { draftToBody, emptyStage, emptyTier, feeToCents, recordToDraft } from "./deadline-facts-editor.ts";
import { deadlineFactsErrorResponse, parseDeadlineFactsBody } from "./deadline-facts-server.ts";

test("typed fees become cents; empty stays unknown", () => {
  assert.equal(feeToCents("25"), 2500);
  assert.equal(feeToCents("$12.50"), 1250);
  assert.equal(feeToCents("1,000"), 100000);
  assert.equal(feeToCents(""), null);
  assert.equal(feeToCents("about ten"), undefined);
});

test("a loaded record round-trips through the draft with local close times", () => {
  const draft = recordToDraft({
    opportunityId: "opp_1",
    deadlineDate: "2027-03-01",
    deadlineTime: "23:59",
    deadlineTimezone: "America/New_York",
    tiers: [{ id: "t1", tier: "early", label: "Early bird", closesOn: "2027-02-01", closesAt: "2027-02-02T04:59:00.000Z", timezone: "America/New_York", feeCents: 1250, feeCurrency: "USD", confidence: "confirmed" }],
    stages: [{ id: "s1", kind: "notification", label: "Results", dueOn: "2027-06-01", confidence: "probable" }],
    revision: "abc",
  });
  assert.equal(draft.tiers[0]!.closesTime, "23:59");
  assert.equal(draft.tiers[0]!.fee, "12.50");
  const built = draftToBody(draft);
  assert.ok("body" in built);
  assert.deepEqual(built.body.tiers[0], { tier: "early", label: "Early bird", closesOn: "2027-02-01", closesTime: "23:59", timezone: "America/New_York", feeCents: 1250, feeCurrency: "USD", confidence: "confirmed" });
  assert.deepEqual(built.body.deadline, { date: "2027-03-01", time: "23:59", timezone: "America/New_York" });
  assert.equal(built.body.expectedRevision, "abc");
});

test("drafts explain what is missing before saving", () => {
  const base = recordToDraft(null);
  assert.deepEqual(draftToBody({ ...base, tiers: [emptyTier()] }), { error: "Fee tier 1 needs a closing date." });
  assert.deepEqual(draftToBody({ ...base, stages: [emptyStage()] }), { error: "Stage 1 needs a date." });
  assert.deepEqual(draftToBody({ ...base, tiers: [emptyTier({ closesOn: "2027-01-01", fee: "ten" })] }), { error: "Fee tier 1 needs a fee written as a number, like 25 or 12.50." });
  assert.deepEqual(draftToBody({ ...base, deadlineTime: "17:00" }), { error: "Add the deadline date before its time." });
});

test("the route body parser takes the revision from If-Match and rejects unsafe links", () => {
  const parsed = parseDeadlineFactsBody({ tiers: [], stages: [], deadline: { date: "2027-01-01" } }, 'W/"rev123"');
  assert.ok(!("error" in parsed));
  assert.equal(parsed.expectedRevision, "rev123");
  assert.deepEqual(parsed.deadline, { date: "2027-01-01" });
  assert.deepEqual(parseDeadlineFactsBody({ tiers: [], stages: [], sourceUrl: "javascript:alert(1)" }), { error: "The source link must start with http or https." });
  assert.deepEqual(parseDeadlineFactsBody({ tiers: "x", stages: [] }), { error: "Send the fee tiers and stages as lists." });
});

test("writer errors map to calm status codes", async () => {
  const conflict = Object.assign(new Error("These dates were changed by someone else."), { name: "ConflictError", current: { revision: "r2" } });
  const response = deadlineFactsErrorResponse(conflict);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "These dates were changed by someone else.", current: { revision: "r2" } });
  assert.equal(deadlineFactsErrorResponse(Object.assign(new Error("Stage 1 needs a date."), { name: "ValidationError" })).status, 400);
  assert.equal(deadlineFactsErrorResponse(new Error("boom")).status, 503);
});
