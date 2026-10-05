import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReplayReport,
  evaluateCandidate,
  orderByCreatorFit,
  recommendFeed,
  runRecommendationHarness,
  type CreatorFitLevel,
  type OpportunityEvidence,
  type RecommendationContext,
  type RecommendationSignal,
} from "../src/index.js";

const now = "2026-08-20T12:00:00.000Z";

function signal<T>(
  key: string,
  value: T | undefined,
  source = "fixture",
): RecommendationSignal<T> {
  return {
    key,
    value,
    source,
    observedAt: now,
    confidence: value === undefined ? 0 : 1,
    explicit: true,
  };
}

const context: RecommendationContext = {
  accountId: "acct_fit",
  contextVersion: "context-test-v1",
  now,
  practice: signal("creator.practice", {
    include: ["writing.poetry"],
    prefer: [],
    exclude: [],
  }),
  opportunityPreferences: signal("creator.preferences", {
    types: ["magazine"],
    genres: ["poetry"],
    noFeeOnly: true,
    locations: [],
    careerStages: [],
  }),
  savedSearches: [],
  followedOrganizations: [],
  selectedWorks: [],
  trackerSignals: [],
  behaviorSignals: [],
};

function opportunity(
  id: string,
  overrides: Partial<OpportunityEvidence> = {},
): OpportunityEvidence {
  return {
    opportunityId: id,
    versionId: `${id}_v1`,
    title: `Call ${id}`,
    publicationState: "published",
    lifecycle: "open",
    type: "magazine",
    taxonomy: signal(
      "opportunity.taxonomy",
      [{ termId: "writing.poetry", certainty: "confirmed" as const }],
      "official",
    ),
    eligibilityRules: [],
    geography: signal(
      "opportunity.geography",
      { mode: "remote" as const, regions: ["global"] },
      "official",
    ),
    fee: signal(
      "opportunity.fee",
      { status: "no-fee" as const, amountMinor: 0, currency: "USD" },
      "official",
    ),
    deadline: signal(
      "opportunity.deadline",
      { kind: "exact", date: "2026-09-20", timeZone: "UTC" },
      "official",
    ),
    source: signal(
      "opportunity.source",
      {
        sourceId: "source_test",
        url: `https://example.test/${id}`,
        authority: "official-organization",
      },
      "official",
    ),
    safety: signal(
      "opportunity.safety",
      {
        state: "clear" as const,
        opportunityVersionId: `${id}_v1`,
        authority: "publication-review" as const,
        authorityDecisionId: `decision_${id}`,
        observedAt: now,
        sourceEvidenceRefs: [`https://example.test/${id}`],
      },
      "review",
    ),
    organization: signal(
      "opportunity.organization",
      { organizationId: `org_${id}`, name: `Org ${id}` },
      "official",
    ),
    ...overrides,
  };
}

const unsafe = (id: string) =>
  opportunity(id, {
    safety: signal(
      "opportunity.safety",
      {
        state: "unsafe" as const,
        opportunityVersionId: `${id}_v1`,
        authority: "publication-review" as const,
        authorityDecisionId: `decision_${id}`,
        observedAt: now,
      },
      "review",
    ),
  });

test("orderByCreatorFit is a stable tier sort that keeps ineligible items in place", () => {
  const items = ["a", "b", "x", "c", "d"];
  const fit = new Map<string, CreatorFitLevel>([
    ["a", "mismatch"],
    ["c", "strong"],
    ["d", "weak"],
    ["x", "strong"],
  ]);
  const ordered = orderByCreatorFit(
    items,
    (id) => id,
    fit,
    (id) => id !== "x",
  );
  // x is not eligible, so it stays at index 2 whatever its fit.
  assert.deepEqual(ordered, ["c", "b", "x", "d", "a"]);
  assert.deepEqual(
    orderByCreatorFit(items, (id) => id, new Map()),
    items,
  );
  assert.deepEqual(
    orderByCreatorFit(items, (id) => id, undefined),
    items,
  );
});

test("creator fit reorders only the eligible set and leaves explanations faithful", () => {
  const opportunities = [
    opportunity("opp_a"),
    opportunity("opp_b"),
    opportunity("opp_c"),
    unsafe("opp_unsafe"),
  ];
  const base = recommendFeed({
    context,
    opportunities,
    surface: "home",
    query: {},
    baselineOpportunityIds: [],
  });
  const fit = new Map<string, CreatorFitLevel>([
    [base.orderedOpportunityIds[0]!, "mismatch"],
    [base.orderedOpportunityIds[2]!, "strong"],
    ["opp_unsafe", "strong"],
  ]);
  const ranked = recommendFeed({
    context,
    opportunities,
    surface: "home",
    query: {},
    baselineOpportunityIds: [],
    creatorFit: fit,
  });

  assert.equal(ranked.usedFallback, false);
  assert.ok(
    !ranked.orderedOpportunityIds.includes("opp_unsafe"),
    "a strong fit never restores an excluded item",
  );
  assert.deepEqual(
    new Set(ranked.orderedOpportunityIds),
    new Set(base.orderedOpportunityIds),
    "same eligible set",
  );
  assert.deepEqual(ranked.orderedOpportunityIds, [
    base.orderedOpportunityIds[2],
    base.orderedOpportunityIds[1],
    base.orderedOpportunityIds[0],
  ]);
  // Scores, contributions and explanations are byte-identical: fit is ordering only.
  assert.deepEqual(ranked.results, base.results);

  const report = buildReplayReport({
    fixtureId: "creator-fit",
    policyVersion: ranked.policyVersion,
    baselineOrder: base.orderedOpportunityIds,
    currentResults: ranked.results,
  });
  assert.deepEqual(report.explanationFaithfulnessFailures, []);
  assert.equal(report.eligibilityViolationCount, 0);
});

test("without creator fit the feed and harness are unchanged", () => {
  const opportunities = [opportunity("opp_a"), opportunity("opp_b")];
  const input = {
    context,
    opportunities,
    surface: "home" as const,
    query: {},
    baselineOpportunityIds: ["opp_b", "opp_a"],
  };
  assert.deepEqual(
    recommendFeed(input),
    recommendFeed({ ...input, creatorFit: new Map() }),
  );
  const harness = runRecommendationHarness({
    ...input,
    creatorFit: new Map([["opp_b", "strong" as const]]),
  });
  assert.deepEqual(
    harness.servedOpportunityIds,
    ["opp_b", "opp_a"],
    "the harness still serves the baseline",
  );
  assert.deepEqual(harness.replayReport.explanationFaithfulnessFailures, []);
  assert.equal(
    evaluateCandidate(context, opportunities[0]!).eligibilityState,
    "eligible",
  );
});
