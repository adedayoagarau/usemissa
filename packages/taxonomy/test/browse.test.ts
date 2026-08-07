import test from "node:test";
import assert from "node:assert/strict";
import {
  MISSA_TAXONOMY,
  canonicalTaxonomySelection,
  termsForBrowseLayer,
  taxonomyDescendantIds,
} from "../src/index.js";

test("public browse layers use canonical parent relationships", () => {
  const writing = "taxterm_pf-writing-and-literature";
  const poetry = "taxterm_disc-poetry";
  assert.ok(termsForBrowseLayer("genre", writing).some((term) => term.id === poetry));
  assert.ok(termsForBrowseLayer("style", poetry).some((term) => term.id === "taxterm_genre-epic-poetry"));
});

test("taxonomy selections are versioned and reject unknown IDs", () => {
  const selection = canonicalTaxonomySelection(["taxterm_disc-poetry", "taxterm_disc-poetry", "not-a-term"]);
  assert.equal(selection.schemeVersion, MISSA_TAXONOMY.scheme.version);
  assert.deepEqual(selection.termIds, ["taxterm_disc-poetry"]);
  assert.deepEqual(selection.invalidTermIds, ["not-a-term"]);
});

test("descendant expansion follows the graph without inventing terms", () => {
  const descendants = taxonomyDescendantIds("taxterm_disc-poetry");
  assert.ok(descendants.includes("taxterm_disc-poetry"));
  assert.ok(descendants.includes("taxterm_genre-epic-poetry"));
  assert.ok(!descendants.includes("taxterm_disc-film"));
});
