import assert from "node:assert/strict";
import test from "node:test";
import {
  parseResponseTime,
  extractPrestigeSignals,
  classifyEditorialDemeanor,
  extractProfileIntelligence,
} from "../src/profileIntelligenceExtractor.js";

test("parseResponseTime parses month ranges, weeks, and query policies", () => {
  const t1 = parseResponseTime("3 to 6 months");
  assert.equal(t1.minDays, 90);
  assert.equal(t1.maxDays, 180);
  assert.equal(t1.label, "3–6 months");
  assert.equal(t1.queryAllowedAfterDays, 180);

  const t2 = parseResponseTime("Within 3 months. Queries allowed after 90 days.");
  assert.equal(t2.maxDays, 90);
  assert.equal(t2.label, "Up to 3 months");
  assert.equal(t2.queryAllowedAfterDays, 90);

  const t3 = parseResponseTime("2-4 weeks");
  assert.equal(t3.minDays, 14);
  assert.equal(t3.maxDays, 28);
  assert.equal(t3.label, "2–4 weeks");

  const t4 = parseResponseTime("Annual review in December");
  assert.equal(t4.minDays, 180);
  assert.equal(t4.maxDays, 365);
  assert.equal(t4.label, "Annual review");

  const tEmpty = parseResponseTime(null);
  assert.equal(tEmpty.label, "Unknown turnaround");
  assert.equal(tEmpty.minDays, null);
});

test("extractPrestigeSignals identifies founding years and national honors", () => {
  const p1 = extractPrestigeSignals({
    editorialFocus: "Founded in 1974, The Georgia Review has won multiple Pushcart Prizes and features Best American Short Stories.",
    circulation: "4500",
  });
  assert.equal(p1.prestigeTier, "Tier 1 (Flagship)");
  assert.equal(p1.foundingYear, 1974);
  assert.ok(p1.honors.includes("Pushcart Prize"));
  assert.ok(p1.honors.includes("Best American Short Stories"));

  const p2 = extractPrestigeSignals({
    editorialFocus: "An independent journal established in 2012 publishing bold new writers.",
    editorialTips: "Nominated for Best of the Net.",
  });
  assert.equal(p2.prestigeTier, "Tier 2 (Established Contemporary)");
  assert.equal(p2.foundingYear, 2012);
  assert.ok(p2.honors.includes("Best of the Net"));

  const p3 = extractPrestigeSignals({
    editorialFocus: "A new literary zine started in 2024 for micro-prose.",
  });
  assert.equal(p3.prestigeTier, "Tier 3 (Emerging & Community)");
  assert.equal(p3.foundingYear, 2024);
});

test("classifyEditorialDemeanor categorizes editorial archetypes accurately", () => {
  const d1 = classifyEditorialDemeanor({
    editorialFocus: "We love to discover first-time writers and emerging voices. Very welcoming to debut work.",
  });
  assert.equal(d1.archetype, "Warm & Debut-Friendly");
  assert.ok(d1.sentimentTags.includes("Debut-Friendly"));

  const d2 = classifyEditorialDemeanor({
    editorialFocus: "Demands absolute formal rigor and technique. We seek literary craft of the highest standard.",
  });
  assert.equal(d2.archetype, "Craft-Focused & Rigorous");

  const d3 = classifyEditorialDemeanor({
    editorialFocus: "Seeking visceral, rule-breaking, weird, experimental, and transgressive hybrid pieces.",
  });
  assert.equal(d3.archetype, "Edgy & Experimental");

  const d4 = classifyEditorialDemeanor({
    editorialTips: "Strict guidelines: any submission with an author name in the manuscript will be disqualified immediately with no exceptions.",
  });
  assert.equal(d4.archetype, "Rules-Strict");
});

test("extractProfileIntelligence combines all dimensions into unified output", () => {
  const result = extractProfileIntelligence({
    responseTime: "2 to 3 months",
    editorialFocus: "Founded in 1985, our journal is welcoming to emerging writers with Pushcart honors.",
  });
  assert.equal(result.responseTime.label, "2–3 months");
  assert.equal(result.prestige.foundingYear, 1985);
  assert.ok(result.prestige.honors.includes("Pushcart Prize"));
  assert.equal(result.demeanor.archetype, "Warm & Debut-Friendly");
});
