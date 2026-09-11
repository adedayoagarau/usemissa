import { test } from "node:test";
import assert from "node:assert/strict";
import type { Opportunity } from "../src/domain/types.js";
import {
  OpportunitySearchEngine,
  searchOpportunities,
  detectOpportunityDomain,
  matchesDomain,
} from "../src/search/opportunitySearchEngine.js";

type OppOverrides = Partial<Omit<Opportunity, "fields">> & { fields?: Partial<Opportunity["fields"]> };

function makeOpp(overrides: OppOverrides = {}): Opportunity {
  const { fields: fieldOverrides, ...rest } = overrides;
  return {
    id: "opp_test_" + Math.random().toString(36).slice(2, 8),
    createdAt: "2026-08-01T00:00:00.000Z",
    status: "open",
    fields: {
      title: "Test Opportunity",
      type: "open-call",
      genres: [],
      deadline: { kind: "exact", date: "2026-11-01" },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
      ...fieldOverrides,
    },
    sourceId: "src_1",
    sourceUrl: "https://example.org/call",
    alternateSourceIds: [],
    scores: { freshness: 95, confidence: 90, trust: 80 },
    trustSignals: [],
    lastCheckedAt: "2026-08-01T00:00:00.000Z",
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    lastExtractionConfidence: 90,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
    ...rest,
  };
}

const opps: Opportunity[] = [
  makeOpp({
    id: "opp_painting_sculpture_exhibition",
    fields: {
      title: "National Juried Exhibition in Painting & Sculpture",
      type: "exhibition",
      genres: ["Painting", "Sculpture"],
      deadline: { kind: "exact", date: "2026-10-15" },
      fee: { disclosed: true, amountCents: 3500, currency: "USD" },
      prize: "$3,000 Best in Show Award",
    },
  }),
  makeOpp({
    id: "opp_macdowell_residency",
    fields: {
      title: "MacDowell Artist Residency Fellowship",
      type: "residency",
      genres: ["Visual Art", "Multidisciplinary", "Painting"],
      deadline: { kind: "exact", date: "2026-10-20" },
      fee: { disclosed: true, amountCents: 0, currency: "USD" },
      prize: "$5,000 stipend + private studio and housing provided",
    },
  }),
  makeOpp({
    id: "opp_poetry_prize",
    fields: {
      title: "The Kenyon Review Poetry Prize",
      type: "magazine",
      genres: ["Poetry"],
      deadline: { kind: "exact", date: "2026-11-15" },
      fee: { disclosed: true, amountCents: 2000, currency: "USD" },
      prize: "$1,000 prize and publication",
    },
  }),
  makeOpp({
    id: "opp_fiction_grant",
    fields: {
      title: "NEA Literature Creative Writing Fellowship in Prose",
      type: "fellowship",
      genres: ["Fiction", "Creative Nonfiction"],
      deadline: { kind: "exact", date: "2026-12-01" },
      fee: { disclosed: true, amountCents: 0, currency: "USD" },
      prize: "$25,000 grant",
    },
  }),
  makeOpp({
    id: "opp_creative_capital_multi",
    fields: {
      title: "Creative Capital Award for Bold Groundbreaking Projects",
      type: "grant",
      genres: ["Multidisciplinary", "Performance", "Film/Video"],
      deadline: { kind: "exact", date: "2026-12-10" },
      fee: { disclosed: true, amountCents: 0, currency: "USD" },
      prize: "$50,000 project grant",
    },
  }),
];

test("detectOpportunityDomain: accurately detects domain categories", () => {
  assert.equal(detectOpportunityDomain(opps[0]!), "visual_arts");
  assert.equal(detectOpportunityDomain(opps[1]!), "residencies");
  assert.equal(detectOpportunityDomain(opps[2]!), "literature");
  assert.equal(detectOpportunityDomain(opps[3]!), "literature");
  assert.equal(detectOpportunityDomain(opps[4]!), "visual_arts"); // Film/Video
});

test("matchesDomain: evaluates domain matching rules", () => {
  assert.equal(matchesDomain(opps[0]!, "visual_arts"), true);
  assert.equal(matchesDomain(opps[0]!, "literature"), false);

  assert.equal(matchesDomain(opps[1]!, "residencies"), true);
  assert.equal(matchesDomain(opps[1]!, "visual_arts"), true);

  assert.equal(matchesDomain(opps[2]!, "literature"), true);
  assert.equal(matchesDomain(opps[2]!, "visual_arts"), false);
});

test("searchOpportunities: query with domain='visual_arts' returns visual arts and excludes pure literature", () => {
  const result = searchOpportunities(opps, { domain: "visual_arts" });

  assert.ok(result.total >= 2);
  const ids = result.items.map((h) => h.opportunity.id);
  assert.ok(ids.includes("opp_painting_sculpture_exhibition"));
  assert.ok(ids.includes("opp_macdowell_residency"));
  assert.ok(!ids.includes("opp_poetry_prize"));
  assert.ok(!ids.includes("opp_fiction_grant"));
});

test("searchOpportunities: query with genres=['Painting', 'Sculpture'] filters accurately", () => {
  const result = searchOpportunities(opps, { genres: ["Painting", "Sculpture"] });

  assert.equal(result.total, 2);
  const ids = result.items.map((h) => h.opportunity.id);
  assert.ok(ids.includes("opp_painting_sculpture_exhibition"));
  assert.ok(ids.includes("opp_macdowell_residency"));
  assert.ok(!ids.includes("opp_poetry_prize"));
});

test("searchOpportunities: query with domain='residencies' returns residency programs", () => {
  const result = searchOpportunities(opps, { domain: "residencies" });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.opportunity.id, "opp_macdowell_residency");
  assert.equal(result.items[0]?.studioProvided, true);
  assert.equal(result.items[0]?.housingProvided, true);
  assert.equal(result.items[0]?.stipendAmountCents, 500000);
});

test("searchOpportunities: query without domain returns both arts and literature without breaking literature results", () => {
  const result = searchOpportunities(opps, {});

  assert.equal(result.total, 5);
  const ids = result.items.map((h) => h.opportunity.id);
  assert.ok(ids.includes("opp_poetry_prize"));
  assert.ok(ids.includes("opp_fiction_grant"));
  assert.ok(ids.includes("opp_painting_sculpture_exhibition"));
  assert.ok(ids.includes("opp_macdowell_residency"));
  assert.ok(ids.includes("opp_creative_capital_multi"));
});

test("searchOpportunities: financial filters (no-fee, maxFeeCents, minStipendCents)", () => {
  const freeCalls = searchOpportunities(opps, { feeStatus: "no-fee" });
  assert.equal(freeCalls.total, 3);
  const freeIds = freeCalls.items.map((h) => h.opportunity.id);
  assert.ok(freeIds.includes("opp_macdowell_residency"));
  assert.ok(freeIds.includes("opp_fiction_grant"));
  assert.ok(freeIds.includes("opp_creative_capital_multi"));

  const highStipends = searchOpportunities(opps, { minStipendCents: 200000 }); // >= $2,000
  assert.ok(highStipends.total >= 3);
});
