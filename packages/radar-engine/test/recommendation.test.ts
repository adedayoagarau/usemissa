import assert from "node:assert/strict";
import test from "node:test";
import {
  DETERMINISTIC_FIT_POLICY_VERSION,
  buildFeatureContributions,
  createFeedSnapshot,
  evaluateCandidate,
  evaluateEligibility,
  explanationFaithfulnessFailures,
  recommendFeed,
  rerankCandidates,
  resolveSafetyEvidence,
  safetyEvidenceIsCurrentAndAuthoritative,
} from "../src/index.js";
import type {
  OpportunityEvidence,
  RecommendationContext,
  RecommendationPolicyConfig,
  RecommendationSignal,
} from "../src/index.js";

const now = "2026-08-20T12:00:00.000Z";

function signal<T>(key: string, value: T | undefined, source = "fixture", missing?: RecommendationSignal<T>["missing"]): RecommendationSignal<T> {
  return { key, value, source, observedAt: now, confidence: value === undefined ? 0 : 1, explicit: true, missing };
}

function context(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    accountId: "acct_test",
    contextVersion: "context-test-v1",
    now,
    practice: signal("creator.practice", { include: ["writing.poetry"], prefer: [], exclude: [] }),
    opportunityPreferences: signal("creator.preferences", { types: ["magazine"], genres: ["poetry"], noFeeOnly: true, locations: [], careerStages: [] }),
    savedSearches: [],
    followedOrganizations: [],
    selectedWorks: [],
    trackerSignals: [],
    behaviorSignals: [],
    ...overrides,
  };
}

function opportunity(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    opportunityId: "opp_test",
    versionId: "opp_test_v1",
    title: "Poetry Call",
    publicationState: "published",
    lifecycle: "open",
    type: "magazine",
    taxonomy: signal("opportunity.taxonomy", [{ termId: "writing.poetry", certainty: "confirmed" }], "official", undefined),
    eligibilityRules: [],
    geography: signal("opportunity.geography", { mode: "remote", regions: ["global"] }, "official"),
    fee: signal("opportunity.fee", { status: "no-fee", amountMinor: 0, currency: "USD" }, "official"),
    accessibility: signal("opportunity.accessibility", ["captions"], "official"),
    preparation: signal("opportunity.preparation", { estimatedDays: 5, requiredMaterialCount: 1 }, "official"),
    deadline: signal("opportunity.deadline", { kind: "exact", date: "2026-09-20", timeZone: "UTC" }, "official"),
    source: signal("opportunity.source", { sourceId: "source_test", url: "https://example.test/call", authority: "official-organization" }, "official"),
    safety: signal("opportunity.safety", {
      state: "clear",
      opportunityVersionId: "opp_test_v1",
      authority: "publication-review",
      authorityDecisionId: "decision_test",
      observedAt: now,
      sourceEvidenceRefs: ["https://example.test/call"],
    }, "review"),
    organization: signal("opportunity.organization", { organizationId: "org_test", name: "Test Organization" }, "official"),
    ...overrides,
  };
}

test("deterministic-fit-v1 returns stable results and contribution-derived explanations", () => {
  const first = evaluateCandidate(context(), opportunity());
  const second = evaluateCandidate(context(), opportunity());
  assert.deepEqual(first, second);
  assert.equal(first.eligibilityState, "eligible");
  assert.ok(first.relevanceScore > 0);
  assert.equal(first.explanation.policyVersion, DETERMINISTIC_FIT_POLICY_VERSION);
  assert.deepEqual(explanationFaithfulnessFailures([first]), []);
});

test("missing fee evidence becomes needs_input, not ineligible", () => {
  const result = evaluateCandidate(context(), opportunity({
    fee: signal<NonNullable<OpportunityEvidence["fee"]["value"]>>("opportunity.fee", undefined, "official", "source-omitted"),
  }));
  assert.equal(result.eligibilityState, "needs_input");
  assert.equal(result.explanation.exclusions.length, 0);
  assert.ok(result.explanation.missingInformation.some((item) => item.code === "fee.unknown"));
});

test("safety authority is current, version-bound, and separate from relevance", () => {
  const resolved = resolveSafetyEvidence({
    opportunityId: "opp_test",
    opportunityVersionId: "opp_test_v1",
    state: "clear",
    authority: "publication-review",
    authorityDecisionId: "decision_test",
    observedAt: now,
    sourceEvidenceRefs: ["review:decision_test"],
    now,
  });
  assert.equal(resolved.value?.state, "clear");
  assert.equal(safetyEvidenceIsCurrentAndAuthoritative(resolved.value!, "opp_test_v1", now), true);
  assert.equal(evaluateEligibility(context(), opportunity({ safety: resolved })).state, "eligible");
});

test("stale, wrong-version, and non-authoritative safety evidence remain unknown", () => {
  const stale = resolveSafetyEvidence({
    opportunityId: "opp_test",
    opportunityVersionId: "opp_test_v1",
    state: "clear",
    authority: "publication-review",
    authorityDecisionId: "decision_stale",
    observedAt: "2026-08-01T00:00:00.000Z",
    sourceEvidenceRefs: ["review:decision_stale"],
    now,
    expiresAt: "2026-08-10T00:00:00.000Z",
  });
  const customerReport = resolveSafetyEvidence({
    opportunityId: "opp_test",
    opportunityVersionId: "opp_test_v1",
    state: "clear",
    authority: "customer-report",
    authorityDecisionId: "report_1",
    observedAt: now,
    sourceEvidenceRefs: ["report:1"],
    now,
  });
  const wrongVersion = opportunity({
    safety: signal("opportunity.safety", {
      state: "clear",
      opportunityVersionId: "opp_test_v0",
      authority: "publication-review",
      authorityDecisionId: "decision_old",
      observedAt: now,
    }, "review"),
  });
  assert.equal(stale.value?.state, "unknown");
  assert.equal(stale.missing, "stale");
  assert.equal(customerReport.value?.state, "unknown");
  assert.equal(customerReport.missing, "not-modeled");
  assert.equal(evaluateEligibility(context(), wrongVersion).state, "unknown");
  assert.equal(evaluateEligibility(context(), wrongVersion).missing[0]?.code, "safety.authority-unknown");
});

test("current authoritative unsafe evidence hard-excludes without changing score meaning", () => {
  const unsafe = resolveSafetyEvidence({
    opportunityId: "opp_test",
    opportunityVersionId: "opp_test_v1",
    state: "unsafe",
    authority: "canonical-moderation",
    authorityDecisionId: "moderation_1",
    observedAt: now,
    sourceEvidenceRefs: ["moderation:1"],
    now,
  });
  const result = evaluateCandidate(context(), opportunity({ safety: unsafe }));
  assert.equal(result.eligibilityState, "ineligible");
  assert.ok(result.explanation.exclusions.some((item) => item.code === "safety.unsafe"));
  assert.equal(result.relevanceScore, 0);
});

test("only confirmed mismatches hard-exclude and diversity cannot restore them", () => {
  const contextWithTravelConstraint = context({
    opportunityPreferences: signal("creator.preferences", { types: ["magazine"], noFeeOnly: true, travel: "unwilling", locations: [], careerStages: [] }),
  });
  const ineligible = evaluateCandidate(contextWithTravelConstraint, opportunity({
    geography: signal("opportunity.geography", { mode: "travel-required", regions: ["Italy"] }, "official"),
  }));
  const eligible = evaluateCandidate(context(), opportunity({ opportunityId: "opp_eligible", organization: signal("opportunity.organization", { organizationId: "org_other", name: "Other" }) }));
  assert.equal(ineligible.eligibilityState, "ineligible");
  assert.equal(ineligible.relevanceScore, 0);
  assert.deepEqual(rerankCandidates([ineligible, eligible], {
    policyVersion: "deterministic-fit-v1",
    featureVersion: "deterministic-fit-features-v1",
    gateVersion: "deterministic-fit-gates-v1",
    explanationVersion: "deterministic-fit-explanations-v1",
    includeNeedsInputInReplay: true,
    includeUnknownInReplay: true,
    maxOrganizationCountInFirstTen: 2,
    maxConsecutiveSameType: 3,
    maxDiscoverySlotsInFirstTen: 1,
  }).map((item) => item.opportunityId), ["opp_eligible"]);
});

test("protected or sensitive values are not inferred", () => {
  const result = evaluateEligibility(context(), opportunity({
    eligibilityRules: [signal("opportunity.eligibility.citizenship", { key: "citizenship", value: "GH", description: "Ghana citizens only" }, "official")],
  }));
  assert.equal(result.state, "eligible");
  assert.equal(result.hardReasons.length, 0);
});

test("explicit creator preference wins over behavior signals", () => {
  const result = evaluateCandidate(context({
    behaviorSignals: [signal("behavior.saved", { opportunityId: "opp_test", action: "saved", occurredAt: now }, "creator-action")],
    opportunityPreferences: signal("creator.preferences", { types: ["magazine"], noFeeOnly: true, travel: "unwilling", locations: [], careerStages: [] }),
  }), opportunity({
    fee: signal("opportunity.fee", { status: "paid", amountMinor: 500, currency: "USD" }, "official"),
  }));
  assert.equal(result.eligibilityState, "ineligible");
  assert.ok(result.explanation.exclusions.some((item) => item.code === "fee.no-fee-required"));
});

test("snapshot is account-bound and pagination-stable", () => {
  const input = {
    accountId: "acct_test",
    surface: "browse" as const,
    query: { sort: "recommended", limit: 10 },
    context: context(),
    orderedOpportunityIds: ["opp_a", "opp_b"],
    generatedAt: now,
    ttlMs: 900_000,
    policyVersion: "deterministic-fit-v1" as const,
  };
  const first = createFeedSnapshot(input);
  const second = createFeedSnapshot(input);
  const otherAccount = createFeedSnapshot({ ...input, accountId: "acct_other" });
  assert.equal(first.feedId, second.feedId);
  assert.notEqual(first.feedId, otherAccount.feedId);
  assert.deepEqual(first.orderedOpportunityIds, ["opp_a", "opp_b"]);
  assert.deepEqual(first.executionState, {
    environment: "pre-production",
    servingMode: "replay-only",
    productionVerification: "unverified",
  });
});

test("fallback is independent and retains baseline order", () => {
  const result = recommendFeed({
    context: context(),
    opportunities: [opportunity()],
    surface: "browse",
    query: { sort: "recommended" },
    baselineOpportunityIds: ["baseline_a", "baseline_b"],
    config: {
      policyVersion: "deterministic-fit-v1",
      featureVersion: "wrong-version",
      gateVersion: "deterministic-fit-gates-v1",
      explanationVersion: "deterministic-fit-explanations-v1",
      includeNeedsInputInReplay: true,
      includeUnknownInReplay: true,
      maxOrganizationCountInFirstTen: 2,
      maxConsecutiveSameType: 3,
      maxDiscoverySlotsInFirstTen: 1,
    } as unknown as RecommendationPolicyConfig,
  });
  assert.equal(result.usedFallback, true);
  assert.equal(result.policyVersion, "baseline");
  assert.deepEqual(result.orderedOpportunityIds, ["baseline_a", "baseline_b"]);
  assert.equal(result.snapshot.executionState.servingMode, "baseline");
  assert.equal(result.snapshot.executionState.environment, "pre-production");
});
