import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RECOMMENDATION_POLICY_CONFIG,
  PRE_PRODUCTION_REPLAY_STATE,
  runRecommendationHarness,
} from "../src/index.js";
import type { OpportunityEvidence, RecommendationContext, RecommendationPolicyConfig, RecommendationSignal } from "../src/index.js";

const now = "2026-08-20T12:00:00.000Z";

function signal<T>(key: string, value: T, source = "harness-fixture"): RecommendationSignal<T> {
  return { key, value, source, observedAt: now, confidence: 1, explicit: true };
}

const context: RecommendationContext = {
  accountId: "acct_harness",
  contextVersion: "harness-context-v1",
  now,
  practice: signal("creator.practice", { include: ["writing.poetry"], prefer: [], exclude: [] }),
  opportunityPreferences: signal("creator.preferences", { types: ["magazine"], noFeeOnly: true, locations: [], careerStages: [] }),
  savedSearches: [],
  followedOrganizations: [],
  selectedWorks: [],
  trackerSignals: [],
  behaviorSignals: [],
};

function opportunity(id: string, versionId = `${id}:v1`): OpportunityEvidence {
  return {
    opportunityId: id,
    versionId,
    title: id,
    publicationState: "published",
    lifecycle: "open",
    type: "magazine",
    taxonomy: signal("opportunity.taxonomy", [{ termId: "writing.poetry", certainty: "confirmed" }]),
    eligibilityRules: [],
    geography: signal("opportunity.geography", { mode: "remote", regions: ["global"] }),
    fee: signal("opportunity.fee", { status: "no-fee", amountMinor: 0, currency: "USD" }),
    preparation: signal("opportunity.preparation", { estimatedDays: 2 }),
    deadline: signal("opportunity.deadline", { kind: "exact", date: "2026-09-20", timeZone: "UTC" }),
    source: signal("opportunity.source", { sourceId: "source_harness", url: `https://example.test/${id}`, authority: "official-organization" }),
    safety: signal("opportunity.safety", { state: "clear", opportunityVersionId: versionId, authority: "publication-review", authorityDecisionId: `decision:${id}`, observedAt: now }),
    organization: signal("opportunity.organization", { organizationId: `org:${id}`, name: id }),
  };
}

function input(overrides: Partial<Parameters<typeof runRecommendationHarness>[0]> = {}): Parameters<typeof runRecommendationHarness>[0] {
  return {
    context,
    opportunities: [opportunity("opp_policy"), opportunity("opp_other")],
    baselineOpportunityIds: ["opp_other", "opp_policy"],
    surface: "browse",
    query: { sort: "recommended", limit: 10 },
    executionState: PRE_PRODUCTION_REPLAY_STATE,
    ...overrides,
  };
}

test("harness computes policy diagnostics but always serves the baseline order", () => {
  const result = runRecommendationHarness(input({ mode: "shadow" }));
  assert.deepEqual(result.servedOpportunityIds, ["opp_other", "opp_policy"]);
  assert.deepEqual(result.baselineOpportunityIds, ["opp_other", "opp_policy"]);
  assert.ok(result.policyOpportunityIds.includes("opp_policy"));
  assert.equal(result.accountIsolationPassed, true);
  assert.equal(result.deterministic, true);
  assert.equal(result.executionState.servingMode, "replay-only");
});

test("harness is failure-isolated and returns the baseline when policy evaluation fails", () => {
  const invalidConfig = { ...DEFAULT_RECOMMENDATION_POLICY_CONFIG, featureVersion: "wrong-version" } as unknown as RecommendationPolicyConfig;
  const result = runRecommendationHarness(input({ config: invalidConfig }));
  assert.deepEqual(result.servedOpportunityIds, ["opp_other", "opp_policy"]);
  assert.deepEqual(result.policyOpportunityIds, []);
  assert.equal(result.usedFallback, true);
  assert.equal(result.policyVersion, "baseline");
  assert.equal(result.replayReport.fallback, "used");
});

test("harness rejects accidental active execution", () => {
  assert.throws(() => runRecommendationHarness(input({
    executionState: { environment: "production", servingMode: "active", productionVerification: "verified" },
  })), /cannot run in active mode/);
});

test("harness preserves account binding and versioned diagnostics", () => {
  const first = runRecommendationHarness(input());
  const second = runRecommendationHarness(input({ context: { ...context, accountId: "acct_other" } }));
  assert.notEqual(first.replayReport.fixtureId, second.replayReport.fixtureId);
  assert.equal(first.accountIsolationPassed, true);
  assert.equal(second.accountIsolationPassed, true);
  assert.equal(first.replayReport.policyVersion, "deterministic-fit-v1");
  assert.equal(second.replayReport.policyVersion, "deterministic-fit-v1");
});
