import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultTaxonomyResolver,
  normalizeTaxonomyPhrase,
  resolveTaxonomyPhrase,
} from "../src/index.js";

test("normalizes Unicode punctuation, accents, hyphens, and spacing once", () => {
  assert.equal(normalizeTaxonomyPhrase("Yorùbá — creative  non-fiction"), "yoruba creative non fiction");
});

test("resolves aliases and stable IDs without collapsing facets", () => {
  const alias = resolveTaxonomyPhrase("creative non-fiction");
  assert.equal(alias.status, "resolved");
  assert.equal(alias.termId, "taxterm_disc-creative-nonfiction");

  const ambiguous = resolveTaxonomyPhrase("film");
  assert.equal(ambiguous.status, "ambiguous");
  assert.ok(ambiguous.candidates.some((candidate) => candidate.facet === "practice-family"));
  assert.ok(ambiguous.candidates.some((candidate) => candidate.facet === "discipline"));
});

test("facet context disambiguates labels and close matches stay reviewable", () => {
  const discipline = defaultTaxonomyResolver.resolve("painting", "discipline");
  assert.equal(discipline.status, "resolved");
  assert.equal(discipline.termId, "taxterm_disc-painting");

  const close = resolveTaxonomyPhrase("observational documentary");
  assert.ok(["resolved", "ambiguous"].includes(close.status));
  assert.ok(close.candidates.length > 0);
});

test("unknown language remains unresolved", () => {
  const result = resolveTaxonomyPhrase("a made-up practice nobody uses");
  assert.equal(result.status, "unresolved");
  assert.equal(result.termId, undefined);
});
