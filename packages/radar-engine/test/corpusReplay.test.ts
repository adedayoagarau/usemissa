import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluateCandidate,
  explanationFaithfulnessFailures,
  resolveSafetyEvidence,
} from "../src/index.js";
import type {
  OpportunityEvidence,
  RecommendationContext,
  RecommendationSignal,
} from "../src/index.js";

interface CorpusCreator {
  id: string;
  country: string;
  timezone: string;
  stage: string;
  practiceTerms: string[];
  opportunityTypes: string[];
  participation: { preferredModes: string[]; travel: string; location: string };
  cost: { feePreference: string; currency: string; maxFeeMinor: number | null };
  accessibilityNeeds: { state: string; values: string[] };
  preparation: { state: string; daysAvailable: number | null };
  goals: { state: string; values: string[] };
}

interface CorpusOpportunity {
  id: string;
  country: string;
  timezone: string;
  mode: string;
  status: string;
  publicationState: OpportunityEvidence["publicationState"];
  sourceAuthority: string;
  sourceVersion: string;
  taxonomy: string[];
  eligibility: { state: string; rules: string[] };
  fee: { state: string; amountMinor: number | null; currency: string };
  funding: { state: string; travelSupport: boolean | null; amountMinor: number | null; amountCurrency?: string };
  accessibility: { state: string; features: string[] };
  preparationDays: number | null;
  evidence: string;
  duplicateGroup: string | null;
  duplicateOf?: string;
  safetyDecision?: string;
}

interface CorpusCase {
  id: string;
  creatorId: string;
  opportunityId: string;
  expectedEligibilityState: "eligible" | "ineligible" | "needs_input" | "unknown";
}

interface Corpus {
  capturedAt: string;
  creators: CorpusCreator[];
  opportunities: CorpusOpportunity[];
  expectedCases: CorpusCase[];
}

const corpus = JSON.parse(readFileSync(new URL("../../test/fixtures/phase-0-global-evaluation-corpus.json", import.meta.url), "utf8")) as Corpus;

const typeByOpportunity: Record<string, string> = {
  opp_local_gh: "residency",
  opp_remote_global: "magazine",
  opp_hybrid_lagos: "fellowship",
  opp_travel_venice: "residency",
  opp_short_prep: "open-call",
  opp_restricted_us: "grant",
  opp_accessible_global: "open-call",
  opp_fee_brazil: "festival",
  opp_unknown_fee_za: "magazine",
  opp_conflicting_deadline: "residency",
  opp_funded_kenya: "fellowship",
  opp_disputed: "magazine",
  opp_removed: "open-call",
  opp_closed: "residency",
  opp_stale_global: "open-call",
  opp_duplicate_primary: "magazine",
  opp_duplicate_copy: "magazine",
  opp_accessibility_unknown: "open-call",
};

function signal<T>(key: string, value: T | undefined, missing?: RecommendationSignal<T>["missing"], explicit = false): RecommendationSignal<T> {
  return { key, value, source: "phase-0-global-corpus", observedAt: corpus.capturedAt, confidence: value === undefined ? 0 : 1, explicit, missing };
}

function missingSignal<T>(key: string, missing: RecommendationSignal<T>["missing"]): RecommendationSignal<T> {
  return signal<T>(key, undefined, missing);
}

function contextFor(creator: CorpusCreator): RecommendationContext {
  const travel = creator.participation.travel === "unwilling" ? "unwilling" : creator.participation.travel === "willing" || creator.participation.travel === "willing-if-funded" ? "willing" : "unknown";
  const preferences = {
    types: creator.opportunityTypes,
    // The fixture carries human-readable creator locations and ISO Opportunity countries
    // separately; do not compare those unlike representations as a mismatch.
    locations: [],
    participation: creator.participation.preferredModes,
    travel,
    noFeeOnly: creator.cost.feePreference === "no-fee" ? true : undefined,
    maxFee: creator.cost.feePreference === "ceiling" && creator.cost.maxFeeMinor !== null
      ? { amountMinor: creator.cost.maxFeeMinor, currency: creator.cost.currency }
      : undefined,
    accessibility: creator.accessibilityNeeds.state === "known" ? creator.accessibilityNeeds.values : undefined,
    preparationDays: creator.preparation.state === "known" ? creator.preparation.daysAvailable ?? undefined : undefined,
    careerStages: creator.stage === "unknown" ? [] : [creator.stage],
    goals: creator.goals.state === "known" ? creator.goals.values : [],
  } satisfies NonNullable<RecommendationContext["opportunityPreferences"]["value"]>;
  return {
    accountId: creator.id,
    contextVersion: "phase-0-global-corpus-v1",
    now: corpus.capturedAt,
    practice: signal("creator.practice", { include: creator.practiceTerms, prefer: [], exclude: [] }, undefined, true),
    opportunityPreferences: signal("creator.opportunity-preferences", preferences, undefined, true),
    savedSearches: [],
    followedOrganizations: [],
    selectedWorks: [],
    trackerSignals: [],
    behaviorSignals: [],
    explicitEligibility: signal("creator.explicit-eligibility", { residence: creator.country }, undefined, true),
  };
}

function safetyFor(opportunity: CorpusOpportunity): RecommendationSignal<NonNullable<OpportunityEvidence["safety"]["value"]>> {
  const state = opportunity.safetyDecision === "confirmed-disputed"
    ? "disputed"
    : opportunity.evidence === "removed"
      ? "removed"
      : "clear";
  const safety = resolveSafetyEvidence({
    opportunityId: opportunity.id,
    opportunityVersionId: `${opportunity.id}:v1`,
    state,
    authority: opportunity.evidence === "removed" ? "canonical-moderation" : "publication-review",
    authorityDecisionId: `phase-0:${opportunity.id}`,
    observedAt: corpus.capturedAt,
    sourceEvidenceRefs: [`source:${opportunity.sourceVersion}`],
    now: corpus.capturedAt,
    expiresAt: opportunity.evidence === "stale" ? "2026-07-01T00:00:00.000Z" : undefined,
  });
  if (opportunity.evidence === "sparse") return { ...safety, value: { ...safety.value!, state: "unknown" }, confidence: 0, missing: "source-omitted" };
  if (opportunity.evidence === "contradictory") return { ...safety, value: { ...safety.value!, state: "unknown" }, confidence: 0, missing: "conflict" };
  return safety;
}

function evidenceFor(opportunity: CorpusOpportunity): OpportunityEvidence {
  const taxonomyCertainty = opportunity.evidence === "complete-current" ? "confirmed" : "inferred";
  const deadline = opportunity.evidence === "contradictory"
    ? missingSignal<NonNullable<NonNullable<OpportunityEvidence["deadline"]>["value"]>>("opportunity.deadline", "conflict")
    : signal("opportunity.deadline", { kind: "exact", date: "2026-09-20", timeZone: opportunity.timezone });
  const rules = opportunity.id === "opp_restricted_us"
    ? [signal("opportunity.eligibility.residence", { key: "residence", value: "US|CA", description: opportunity.eligibility.rules[0] })]
    : [];
  return {
    opportunityId: opportunity.id,
    versionId: `${opportunity.id}:v1`,
    title: opportunity.id,
    publicationState: opportunity.publicationState,
    lifecycle: opportunity.status === "closed" ? "closed" : opportunity.status === "removed" || opportunity.status === "duplicate" ? "unknown" : opportunity.status as OpportunityEvidence["lifecycle"],
    type: typeByOpportunity[opportunity.id] ?? "other",
    taxonomy: signal("opportunity.taxonomy", opportunity.taxonomy.map((termId) => ({ termId, certainty: taxonomyCertainty }))),
    eligibilityRules: rules,
    geography: signal("opportunity.geography", { mode: opportunity.mode === "local" ? "onsite" : opportunity.mode as NonNullable<OpportunityEvidence["geography"]["value"]>["mode"], regions: [opportunity.country] }),
    fee: signal("opportunity.fee", opportunity.fee.state === "unknown" ? { status: "unknown", currency: opportunity.fee.currency } : { status: opportunity.fee.amountMinor === 0 ? "no-fee" : "paid", amountMinor: opportunity.fee.amountMinor ?? undefined, currency: opportunity.fee.currency }),
    funding: opportunity.funding.state === "unknown" ? missingSignal<NonNullable<NonNullable<OpportunityEvidence["funding"]>["value"]>>("opportunity.funding", "source-omitted") : signal("opportunity.funding", { kind: "grant", amountMinor: opportunity.funding.amountMinor ?? undefined, currency: opportunity.funding.amountCurrency ?? opportunity.fee.currency, travelSupport: opportunity.funding.travelSupport ?? undefined }),
    accessibility: opportunity.accessibility.state === "unknown" ? missingSignal<string[]>("opportunity.accessibility", "source-omitted") : signal("opportunity.accessibility", opportunity.accessibility.features),
    preparation: opportunity.preparationDays === null ? missingSignal<NonNullable<NonNullable<OpportunityEvidence["preparation"]>["value"]>>("opportunity.preparation", "source-omitted") : signal("opportunity.preparation", { estimatedDays: opportunity.preparationDays }),
    deadline,
    source: signal("opportunity.source", { sourceId: opportunity.sourceVersion, url: `https://example.test/${opportunity.id}`, authority: opportunity.sourceAuthority }),
    safety: safetyFor(opportunity),
    duplicate: opportunity.duplicateGroup ? signal("opportunity.duplicate", { isDuplicate: Boolean(opportunity.duplicateOf), canonicalOpportunityId: opportunity.duplicateOf }) : undefined,
    organization: signal("opportunity.organization", { organizationId: `org:${opportunity.id}`, name: opportunity.id }),
  };
}

test("Phase 0 global corpus replays all golden eligibility cases", () => {
  const creators = new Map(corpus.creators.map((creator) => [creator.id, creator]));
  const opportunities = new Map(corpus.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const results = corpus.expectedCases.map((expected) => {
    const creator = creators.get(expected.creatorId);
    const opportunity = opportunities.get(expected.opportunityId);
    assert.ok(creator, `missing creator fixture ${expected.creatorId}`);
    assert.ok(opportunity, `missing opportunity fixture ${expected.opportunityId}`);
    const result = evaluateCandidate(contextFor(creator!), evidenceFor(opportunity!));
    assert.equal(result.eligibilityState, expected.expectedEligibilityState, expected.id);
    return result;
  });
  assert.deepEqual(explanationFaithfulnessFailures(results), []);
  assert.equal(results.filter((result) => result.eligibilityState === "ineligible" && result.relevanceScore > 0).length, 0);
});

test("Phase 0 corpus covers the required global and adversarial dimensions", () => {
  assert.equal(corpus.creators.length, 10);
  assert.equal(corpus.opportunities.length, 18);
  assert.ok(new Set(corpus.creators.map((creator) => creator.country)).size >= 8);
  assert.ok(new Set(corpus.creators.map((creator) => creator.timezone)).size >= 8);
  assert.ok(new Set(corpus.opportunities.map((opportunity) => opportunity.fee.currency)).size >= 8);
  assert.ok(corpus.opportunities.some((opportunity) => opportunity.evidence === "sparse"));
  assert.ok(corpus.opportunities.some((opportunity) => opportunity.evidence === "contradictory"));
  assert.ok(corpus.opportunities.some((opportunity) => opportunity.evidence === "disputed"));
  assert.ok(corpus.opportunities.some((opportunity) => opportunity.evidence === "removed"));
  assert.ok(corpus.opportunities.some((opportunity) => opportunity.duplicateGroup));
});
