import assert from "node:assert/strict";
import test from "node:test";
import { TAXONOMY_FACET_KEYS } from "@missa/taxonomy";
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

test("a unique practice phrase becomes a typed taxonomy filter, not loose search text", () => {
  const plan = buildOpportunitySearchPlan("Find free fellowships for screenwriter");
  assert.deepEqual(plan.types, ["fellowship"]);
  assert.equal(plan.feeStatus, "no-fee");
  assert.equal(plan.query, undefined);
  assert.deepEqual(plan.taxonomy, [{
    termId: "taxterm_role-screenwriter",
    facet: "role",
    label: "Screenwriter",
    sourcePhrase: "screenwriter",
  }]);
  assert.deepEqual(plan.repositoryQuery.taxonomyTermIds, ["taxterm_role-screenwriter"]);
  assert.equal(plan.repositoryQuery.taxonomyIncludeDescendants, true);
});

test("an ambiguous practice phrase asks the customer instead of silently collapsing facets", () => {
  const plan = buildOpportunitySearchPlan("Find film grants");
  assert.deepEqual(plan.types, ["grant"]);
  assert.equal(plan.taxonomy.length, 0);
  assert.equal(plan.repositoryQuery.taxonomyTermIds?.length, 0);
  assert.ok(plan.clarifications.length > 0);
  assert.equal(plan.clarifications[0]?.phrase, "film");
  assert.ok(new Set(plan.clarifications[0]?.options.map((option) => option.facet)).size > 1);
});

test("the customer-safe parser recognises all twelve independent field facets", () => {
  assert.deepEqual(TAXONOMY_FACET_KEYS, [
    "practice-family",
    "discipline",
    "form",
    "genre",
    "subgenre",
    "medium",
    "technique",
    "mode",
    "role",
    "theme",
    "audience",
    "language",
  ]);
});
