import assert from "node:assert/strict";
import test from "node:test";
import {
  MISSA_TAXONOMY,
  taxonomyTermId,
  validateTaxonomyCatalog,
} from "../src/index.js";

test("canonical taxonomy is internally valid and comprehensive", () => {
  const result = validateTaxonomyCatalog(MISSA_TAXONOMY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(result.counts["practice-family"], 19);
  assert.ok(MISSA_TAXONOMY.terms.length >= 500);
});

test("cross-disciplinary concepts retain multiple parents", () => {
  const screenwriting = MISSA_TAXONOMY.terms.find(
    (term) => term.id === taxonomyTermId("discipline", "screenwriting"),
  );
  assert.ok(screenwriting);
  assert.deepEqual(
    new Set(screenwriting.broaderTermIds),
    new Set([
      taxonomyTermId("practice-family", "writing and literature"),
      taxonomyTermId("practice-family", "film and moving image"),
    ]),
  );
});

test("subgenres resolve to canonical genre parents", () => {
  const afrofuturism = MISSA_TAXONOMY.terms.find(
    (term) => term.id === taxonomyTermId("subgenre", "afrofuturism"),
  );
  assert.ok(
    afrofuturism?.broaderTermIds.includes(
      taxonomyTermId("genre", "science fiction"),
    ),
  );
});
