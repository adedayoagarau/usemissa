import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFirstSaveProvenance,
  clearRecommendationSignal,
  createRecommendationEvidenceRecord,
  toOpportunityEvidence,
  toRecommendationContext,
} from "../src/index.js";
import type { OpportunityBrowseProjection, UserProfile } from "@missa/radar-engine";

const projection = {
  id: "opp_adapter",
  slug: "adapter-call",
  title: "Adapter Call",
  status: "open",
  type: "magazine",
  genres: ["poetry"],
  deadline: { kind: "exact", date: "2026-09-01", timezone: "UTC" },
  fee: { status: "no-fee", amountCents: 0, currency: "USD" },
  submissionAvailable: true,
  source: {
    kind: "organization-website",
    name: "Adapter Organization",
    url: "https://adapter.example/call",
    checkedAt: "2026-08-20T00:00:00.000Z",
    organizationConfirmed: true,
    verifiedUntil: "2026-09-01T00:00:00.000Z",
  },
  organizationId: "org_adapter",
  organizationName: "Adapter Organization",
  taxonomy: { schemeVersion: 1, termIds: ["writing.poetry"], primaryTermIds: ["writing.poetry"] },
} as OpportunityBrowseProjection;

test("canonical evidence adapter fails closed when publication and safety authority are omitted", () => {
  const evidence = toOpportunityEvidence(projection, { versionId: "opp_adapter_v1" });
  assert.equal(evidence.versionId, "opp_adapter_v1");
  assert.equal(evidence.publicationState, "unknown");
  assert.equal(evidence.safety.value?.state, "unknown");
  assert.equal(evidence.safety.missing, "not-modeled");
  assert.equal(evidence.taxonomy.value?.[0]?.certainty, "inferred");
});

test("creator adapter keeps explicit taxonomy, follow, Work, and Tracker provenance account-bound", () => {
  const user: UserProfile = {
    id: "user_adapter",
    displayName: "Creator",
    attributes: { "career-stage": "emerging" },
    genres: ["poetry"],
    taxonomyPreferences: [{ termId: "writing.poetry", preference: "prefer", weight: 1 }],
    opportunityPreferences: {
      types: ["magazine"],
      disciplines: [],
      genres: ["poetry"],
      locations: [],
      careerStages: ["emerging"],
      noFeeOnly: true,
      simultaneousRequired: false,
    },
  };
  const context = toRecommendationContext({
    accountId: "acct_adapter",
    now: "2026-08-20T00:00:00.000Z",
    contextVersion: "context_adapter_v1",
    user,
    profiles: [],
    follows: [{ userId: "user_adapter", organizationId: "org_adapter", followedAt: "2026-08-01T00:00:00.000Z" }],
    works: [{ id: "work_adapter", userId: "user_adapter", title: "Private Work", taxonomyAssignments: [{ termId: "writing.poetry", primary: true, assignmentOrigin: "user" }], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" }],
    tracked: [{ userId: "user_adapter", opportunityId: "opp_adapter", trackedAt: "2026-08-02T00:00:00.000Z", notify: true, myStatus: "interested", events: [] }],
  });
  assert.equal(context.accountId, "acct_adapter");
  assert.equal(context.practice.value?.prefer[0], "writing.poetry");
  assert.equal(context.followedOrganizations[0]?.value, "org_adapter");
  assert.equal(context.selectedWorks[0]?.value?.workId, "work_adapter");
  assert.equal(context.trackerSignals[0]?.value?.opportunityId, "opp_adapter");
});

test("first-Save provenance and evidence records are deterministic and undo is reversible", () => {
  const evidence = toOpportunityEvidence(projection, {
    versionId: "opp_adapter_v1",
    publicationState: "published",
    safetyState: "clear",
    safetyAuthority: "publication-review",
    safetyDecisionId: "decision_adapter",
    safetySourceRef: "review:decision_adapter",
    taxonomyCertainty: "confirmed",
  });
  const provenance = buildFirstSaveProvenance({ accountId: "acct_adapter", opportunity: evidence, revalidatedAt: "2026-08-20T01:00:00.000Z", intentFingerprint: "fingerprint_v1", taxonomyAssignmentIds: ["term_b", "term_a"], eligibilityRuleIds: ["rule_b", "rule_a"] });
  assert.deepEqual(provenance.taxonomyAssignmentIds, ["term_a", "term_b"]);
  assert.deepEqual(provenance.eligibilityRuleIds, ["rule_a", "rule_b"]);
  assert.equal(provenance.opportunitySourceSnapshot.sourceId, "Adapter Organization");
  assert.equal(provenance.opportunitySourceSnapshot.observedAt, "2026-08-20T00:00:00.000Z");
  assert.equal(provenance.safetyAuthority, "publication-review");
  assert.equal(provenance.safetyDecisionId, "decision_adapter");
  assert.deepEqual(provenance.safetyEvidenceRefs, ["https://adapter.example/call", "review:decision_adapter"]);
  assert.equal(provenance.undoState, "active");
  const base = { accountId: "acct_adapter", feedId: "feed_adapter", opportunityId: "opp_adapter", opportunityVersionId: "opp_adapter_v1", event: "served" as const, ordinal: 0, policyVersion: "deterministic-fit-v1", featureVersion: "deterministic-fit-features-v1", eligibilityVersion: "deterministic-fit-gates-v1", sourceEvidenceRefs: evidence.source.sourceRef ? [evidence.source.sourceRef] : [], occurredAt: "2026-08-20T01:00:00.000Z", ingestedAt: "2026-08-20T01:00:01.000Z" };
  assert.deepEqual(createRecommendationEvidenceRecord(base), createRecommendationEvidenceRecord(base));
  const cleared = clearRecommendationSignal({ accountId: "acct_adapter", signalId: "signal_1", clearedAt: "2026-08-20T02:00:00.000Z", reason: "creator-request" });
  assert.equal(cleared.invalidateActiveContext, true);
  assert.equal(cleared.retainHistoricalEvidence, true);
});
