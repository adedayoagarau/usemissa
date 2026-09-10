import assert from "node:assert/strict";
import test from "node:test";

import {
  mapPracticesToTaxonomy,
  mapInterestsToOpportunityTypes,
  mapTaxonomyToPracticeLabels,
  mapOpportunityTypesToInterestLabels,
} from "./creatorOnboardingTaxonomy";

test("maps Writing and Poetry refinement to canonical taxonomy terms", () => {
  const result = mapPracticesToTaxonomy(["Writing"], ["Poetry", "Fiction"]);
  const termIds = result.map((r) => r.termId);

  assert.ok(termIds.includes("taxterm_pf-writing-and-literature"));
  assert.ok(termIds.includes("taxterm_disc-poetry"));
  assert.ok(termIds.includes("taxterm_disc-fiction"));
  assert.equal(
    result.every((r) => r.preference === "prefer"),
    true,
  );
  assert.equal(
    result.every((r) => r.weight === 100),
    true,
  );
});

test("maps Design & craft to design and craft families plus refinements", () => {
  const result = mapPracticesToTaxonomy(["Design & craft"], ["Ceramics"]);
  const termIds = result.map((r) => r.termId);

  assert.ok(termIds.includes("taxterm_pf-design"));
  assert.ok(termIds.includes("taxterm_pf-craft-and-material-arts"));
  assert.ok(termIds.includes("taxterm_disc-ceramics"));
});

test("maps interest cards to canonical opportunity types without duplicate types", () => {
  const types = mapInterestsToOpportunityTypes([
    "Grants & funding",
    "Residencies",
    "Publication opportunities",
  ]);

  assert.ok(types.includes("grant"));
  assert.ok(types.includes("residency"));
  assert.ok(types.includes("magazine"));
  assert.ok(types.includes("open-call"));
  // Ensure no duplicate entries
  assert.equal(new Set(types).size, types.length);
});

test("maps stored taxonomy terms back into human practice and refinement labels", () => {
  const { practices, refinements } = mapTaxonomyToPracticeLabels([
    "taxterm_pf-writing-and-literature",
    "taxterm_disc-poetry",
    "taxterm_pf-visual-arts",
    "taxterm_disc-painting",
  ]);

  assert.deepEqual(practices.sort(), ["Visual arts", "Writing"].sort());
  assert.deepEqual(refinements.sort(), ["Painting", "Poetry"].sort());
});

test("maps stored opportunity types back into interest card labels", () => {
  const interests = mapOpportunityTypesToInterestLabels([
    "grant",
    "fellowship",
  ]);

  assert.ok(interests.includes("Grants & funding"));
  assert.ok(interests.includes("Fellowships & awards"));
  assert.ok(!interests.includes("Residencies"));
});
