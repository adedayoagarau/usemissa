import assert from "node:assert/strict";
import test from "node:test";
import { buildOpportunitySearchPlan } from "./chatContext";

test("baseline context planning is bounded and transparent", () => {
  const plan = buildOpportunitySearchPlan("Find free fellowships for writers");
  assert.deepEqual(plan.types, ["fellowship"]);
  assert.equal(plan.feeStatus, "no-fee");
  assert.equal(plan.query, "writers");
  assert.equal(plan.repositoryQuery.openNow, true);
  assert.equal(plan.repositoryQuery.limit, 8);
  assert.equal(plan.repositoryQuery.verifiedOnly, false);
});

test("baseline context planning keeps explicit recommendation intent", () => {
  const plan = buildOpportunitySearchPlan("Show the best grants for poets");
  assert.equal(plan.sort, "recommended");
  assert.deepEqual(plan.types, ["grant"]);
  assert.equal(plan.query, "poets");
});
