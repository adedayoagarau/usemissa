import assert from "node:assert/strict";
import test from "node:test";
import { taxonomyFacetKeySchema } from "@missa/contracts";
import { TAXONOMY_FACET_LABELS, taxonomyFacetLabel } from "./taxonomy-labels";

test("every taxonomy key has a plain customer label", () => {
  assert.deepEqual(Object.keys(TAXONOMY_FACET_LABELS).sort(), [...taxonomyFacetKeySchema.options].sort());
  for (const key of taxonomyFacetKeySchema.options) {
    const label = taxonomyFacetLabel(key);
    assert.notEqual(label, key);
    assert.doesNotMatch(label, /\bfield\b|practice|facet|taxonomy/iu);
  }
});

test("the broadest kind of work reads as what you make", () => {
  assert.equal(taxonomyFacetLabel("practice-family"), "What you make");
  assert.equal(taxonomyFacetLabel("technique"), "Technique or process");
});

test("unknown keys never render the raw key", () => {
  assert.equal(taxonomyFacetLabel("legacy-unknown"), "Details");
  assert.equal(taxonomyFacetLabel("toString"), "Details");
});
