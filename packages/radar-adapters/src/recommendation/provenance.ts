import { createHash } from "node:crypto";
import type { OpportunityEvidence, SafetyEvidenceAuthority } from "@missa/radar-engine";

export type RecommendationEvidenceEvent = "requested" | "served" | "rendered" | "viewable" | "opened" | "action";

export interface RecommendationEvidenceRecord {
  eventId: string;
  idempotencyKey: string;
  accountId: string;
  feedId: string;
  opportunityId: string;
  opportunityVersionId: string;
  event: RecommendationEvidenceEvent;
  ordinal?: number;
  policyVersion: string;
  featureVersion: string;
  taxonomyVersion?: number;
  eligibilityVersion: string;
  sourceEvidenceRefs: string[];
  occurredAt: string;
  ingestedAt: string;
  action?: "opened" | "saved" | "dismissed" | "tracked" | "status-changed";
}

export interface FirstSaveProvenance {
  accountId: string;
  trackerId?: string;
  opportunityId: string;
  opportunityVersionId: string;
  opportunitySourceSnapshot: {
    sourceId: string;
    url: string;
    authority: string;
    observedAt: string;
  };
  taxonomyVersion?: number;
  taxonomyAssignmentIds: string[];
  sourceEvidenceRefs: string[];
  eligibilityRuleIds: string[];
  safetyState: "clear" | "disputed" | "removed" | "unsafe" | "unknown";
  safetyAuthority?: SafetyEvidenceAuthority;
  safetyDecisionId?: string;
  safetyEvidenceRefs: string[];
  intentFingerprint: string;
  revalidatedAt: string;
  undoState: "active" | "cleared";
}

export function buildFirstSaveProvenance(input: {
  accountId: string;
  trackerId?: string;
  opportunity: OpportunityEvidence;
  revalidatedAt: string;
  intentFingerprint: string;
  taxonomyAssignmentIds?: string[];
  eligibilityRuleIds?: string[];
}): FirstSaveProvenance {
  return {
    accountId: input.accountId,
    trackerId: input.trackerId,
    opportunityId: input.opportunity.opportunityId,
    opportunityVersionId: input.opportunity.versionId,
    opportunitySourceSnapshot: {
      sourceId: input.opportunity.source.value?.sourceId ?? "unknown",
      url: input.opportunity.source.value?.url ?? input.opportunity.source.sourceRef ?? "",
      authority: input.opportunity.source.value?.authority ?? "unknown",
      observedAt: input.opportunity.source.observedAt,
    },
    taxonomyVersion: input.opportunity.taxonomy.taxonomyVersion,
    taxonomyAssignmentIds: [...(input.taxonomyAssignmentIds ?? [])].sort(),
    sourceEvidenceRefs: [input.opportunity.source.sourceRef, input.opportunity.source.value?.url].filter((value): value is string => Boolean(value)),
    eligibilityRuleIds: [...(input.eligibilityRuleIds ?? [])].sort(),
    safetyState: input.opportunity.safety.value?.state ?? "unknown",
    safetyAuthority: input.opportunity.safety.value?.authority,
    safetyDecisionId: input.opportunity.safety.value?.authorityDecisionId,
    safetyEvidenceRefs: [...(input.opportunity.safety.value?.sourceEvidenceRefs ?? [])].sort(),
    intentFingerprint: input.intentFingerprint,
    revalidatedAt: input.revalidatedAt,
    undoState: "active",
  };
}

export function createRecommendationEvidenceRecord(input: Omit<RecommendationEvidenceRecord, "eventId" | "idempotencyKey">): RecommendationEvidenceRecord {
  const canonical = JSON.stringify({
    accountId: input.accountId,
    feedId: input.feedId,
    opportunityId: input.opportunityId,
    opportunityVersionId: input.opportunityVersionId,
    event: input.event,
    ordinal: input.ordinal,
    occurredAt: input.occurredAt,
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return { ...input, eventId: `recommendation_${hash.slice(0, 24)}`, idempotencyKey: hash };
}

export function clearRecommendationSignal(input: {
  accountId: string;
  signalId: string;
  clearedAt: string;
  reason: "creator-request" | "account-deletion" | "privacy-reset";
}): { accountId: string; signalId: string; clearedAt: string; reason: string; invalidateActiveContext: true; retainHistoricalEvidence: true } {
  return { ...input, invalidateActiveContext: true, retainHistoricalEvidence: true };
}
