import assert from "node:assert/strict";
import test from "node:test";

import { onboardingMatchParams } from "./onboardingMatches";

test("kinds of work widen the match with any-term taxonomy", () => {
  const params = onboardingMatchParams({
    practices: ["Writing", "Performance"],
    refinements: [],
    interests: [],
  });
  const terms = params.get("taxonomy")?.split(",") ?? [];
  assert.equal(params.get("taxonomyMatch"), "any");
  assert.ok(terms.includes("taxterm_pf-writing-and-literature"));
  assert.ok(terms.includes("taxterm_disc-poetry"));
  // Performance counts its dance and theatre families, not only its own term.
  assert.ok(terms.includes("taxterm_pf-performance-and-live-art"));
  assert.ok(terms.includes("taxterm_pf-dance-and-choreography"));
});

test("a chosen refinement narrows only its own discipline", () => {
  const params = onboardingMatchParams({
    practices: ["Writing", "Visual arts"],
    refinements: ["Poetry"],
    interests: [],
  });
  const terms = params.get("taxonomy")?.split(",") ?? [];
  assert.ok(terms.includes("taxterm_disc-poetry"));
  assert.ok(!terms.includes("taxterm_pf-writing-and-literature"));
  assert.ok(!terms.includes("taxterm_disc-fiction"));
  assert.ok(terms.includes("taxterm_pf-visual-arts"));
});

test("interests, country, and fee narrow the match", () => {
  const params = onboardingMatchParams({
    practices: [],
    refinements: [],
    interests: ["Residencies", "Grants & funding"],
    countryCode: "NG",
    noFeeOnly: true,
  });
  assert.equal(params.get("taxonomy"), null);
  assert.deepEqual(params.get("types")?.split(",").sort(), [
    "grant",
    "residency",
  ]);
  assert.equal(params.get("countryCode"), "NG");
  assert.equal(params.get("feeToggle"), "1");
});

test("no choices produce an unfiltered query", () => {
  const params = onboardingMatchParams({
    practices: [],
    refinements: [],
    interests: [],
  });
  assert.equal(params.toString(), "");
});
