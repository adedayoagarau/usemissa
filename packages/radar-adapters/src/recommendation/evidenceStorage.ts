import { createHash } from "node:crypto";
import type {
  FirstSaveProvenance,
  RecommendationEvidenceRecord,
} from "./provenance.js";

export const RECOMMENDATION_EVIDENCE_STORAGE_SCHEMA_VERSION =
  "deterministic-fit-recommendation-evidence-v1" as const;

export const RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT = {
  schemaVersion: RECOMMENDATION_EVIDENCE_STORAGE_SCHEMA_VERSION,
  signalTable: "recommendation_signal_records",
  eventTable: "recommendation_evidence_events",
  signalRequiredColumns: [
    "signal_id",
    "account_id",
    "opportunity_id",
    "opportunity_version_id",
    "taxonomy_version",
    "taxonomy_assignment_ids",
    "source_evidence_refs",
    "opportunity_source_snapshot",
    "eligibility_rule_ids",
    "safety_state",
    "safety_authority",
    "safety_decision_id",
    "safety_evidence_refs",
    "intent_fingerprint",
    "revalidated_at",
    "undo_state",
    "created_at",
    "cleared_at",
  ],
  eventRequiredColumns: [
    "event_id",
    "idempotency_key",
    "account_id",
    "feed_id",
    "opportunity_id",
    "opportunity_version_id",
    "event",
    "ordinal",
    "policy_version",
    "feature_version",
    "taxonomy_version",
    "eligibility_version",
    "source_evidence_refs",
    "occurred_at",
    "ingested_at",
  ],
  constraints: [
    "signal_id is unique",
    "signal account_id is immutable",
    "event idempotency_key is unique per account",
    "signal opportunity_version_id is required",
    "clear appends history and does not delete the signal",
    "analytics tables are not recommendation authority",
  ],
} as const;

export interface RecommendationSignalRecord extends FirstSaveProvenance {
  signalId: string;
  createdAt: string;
  clearedAt?: string;
}

export interface RecommendationSignalRecordInput {
  signalId?: string;
  provenance: FirstSaveProvenance;
  createdAt: string;
}

export interface RecommendationSignalClearResult {
  accountId: string;
  signalId: string;
  clearedAt: string;
  reason: "creator-request" | "account-deletion" | "privacy-reset";
  active: false;
  retainHistoricalEvidence: true;
}

export interface RecommendationEvidenceStorageReadiness {
  status: "ready" | "unavailable";
  schemaVersion: typeof RECOMMENDATION_EVIDENCE_STORAGE_SCHEMA_VERSION;
  signalTablePresent: boolean;
  eventTablePresent: boolean;
  warnings: string[];
}

export interface RecommendationEvidenceStoragePort {
  putSignal(input: RecommendationSignalRecordInput): Promise<{
    status: "created" | "replayed";
    signal: RecommendationSignalRecord;
  }>;
  getSignal(
    accountId: string,
    signalId: string,
  ): Promise<RecommendationSignalRecord | null>;
  listActiveSignals(accountId: string): Promise<RecommendationSignalRecord[]>;
  clearSignal(input: {
    accountId: string;
    signalId: string;
    clearedAt: string;
    reason: RecommendationSignalClearResult["reason"];
  }): Promise<RecommendationSignalClearResult>;
  appendEvent(input: RecommendationEvidenceRecord): Promise<{
    status: "created" | "replayed";
    event: RecommendationEvidenceRecord;
  }>;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function recommendationSignalId(
  provenance: FirstSaveProvenance,
): string {
  return `recommendation_signal_${stableHash({
    accountId: provenance.accountId,
    opportunityId: provenance.opportunityId,
    opportunityVersionId: provenance.opportunityVersionId,
    intentFingerprint: provenance.intentFingerprint,
  }).slice(0, 24)}`;
}

export function createRecommendationSignalRecord(
  input: RecommendationSignalRecordInput,
): RecommendationSignalRecord {
  return {
    ...input.provenance,
    signalId: input.signalId ?? recommendationSignalId(input.provenance),
    createdAt: input.createdAt,
  };
}

export class InMemoryRecommendationEvidenceStore implements RecommendationEvidenceStoragePort {
  private readonly signals = new Map<string, RecommendationSignalRecord>();
  private readonly events = new Map<string, RecommendationEvidenceRecord>();

  async putSignal(input: RecommendationSignalRecordInput): Promise<{
    status: "created" | "replayed";
    signal: RecommendationSignalRecord;
  }> {
    const signal = createRecommendationSignalRecord(input);
    const existing = this.signals.get(signal.signalId);
    if (existing) {
      if (existing.accountId !== signal.accountId)
        throw new Error("Recommendation signal belongs to another account");
      if (JSON.stringify(existing) !== JSON.stringify(signal))
        throw new Error("Recommendation signal idempotency conflict");
      return {
        status: "replayed",
        signal: {
          ...existing,
          taxonomyAssignmentIds: [...existing.taxonomyAssignmentIds],
          sourceEvidenceRefs: [...existing.sourceEvidenceRefs],
          eligibilityRuleIds: [...existing.eligibilityRuleIds],
          safetyEvidenceRefs: [...existing.safetyEvidenceRefs],
        },
      };
    }
    this.signals.set(signal.signalId, signal);
    return {
      status: "created",
      signal: {
        ...signal,
        taxonomyAssignmentIds: [...signal.taxonomyAssignmentIds],
        sourceEvidenceRefs: [...signal.sourceEvidenceRefs],
        eligibilityRuleIds: [...signal.eligibilityRuleIds],
        safetyEvidenceRefs: [...signal.safetyEvidenceRefs],
      },
    };
  }

  async getSignal(
    accountId: string,
    signalId: string,
  ): Promise<RecommendationSignalRecord | null> {
    const signal = this.signals.get(signalId);
    if (!signal) return null;
    if (signal.accountId !== accountId)
      throw new Error("Recommendation signal belongs to another account");
    return {
      ...signal,
      taxonomyAssignmentIds: [...signal.taxonomyAssignmentIds],
      sourceEvidenceRefs: [...signal.sourceEvidenceRefs],
      eligibilityRuleIds: [...signal.eligibilityRuleIds],
      safetyEvidenceRefs: [...signal.safetyEvidenceRefs],
    };
  }

  async listActiveSignals(
    accountId: string,
  ): Promise<RecommendationSignalRecord[]> {
    const signals = [...this.signals.values()]
      .filter(
        (signal) =>
          signal.accountId === accountId &&
          signal.undoState === "active" &&
          !signal.clearedAt,
      )
      .sort((left, right) => left.signalId.localeCompare(right.signalId));
    return Promise.all(
      signals.map((signal) => this.getSignal(accountId, signal.signalId)),
    ).then((items) =>
      items.filter((item): item is RecommendationSignalRecord => Boolean(item)),
    );
  }

  async clearSignal(input: {
    accountId: string;
    signalId: string;
    clearedAt: string;
    reason: RecommendationSignalClearResult["reason"];
  }): Promise<RecommendationSignalClearResult> {
    const signal = this.signals.get(input.signalId);
    if (!signal) throw new Error("Recommendation signal not found");
    if (signal.accountId !== input.accountId)
      throw new Error("Recommendation signal belongs to another account");
    if (!signal.clearedAt) {
      signal.clearedAt = input.clearedAt;
      signal.undoState = "cleared";
    }
    return {
      accountId: input.accountId,
      signalId: input.signalId,
      clearedAt: signal.clearedAt,
      reason: input.reason,
      active: false,
      retainHistoricalEvidence: true,
    };
  }

  async appendEvent(input: RecommendationEvidenceRecord): Promise<{
    status: "created" | "replayed";
    event: RecommendationEvidenceRecord;
  }> {
    const existing = this.events.get(input.idempotencyKey);
    if (existing) {
      if (existing.accountId !== input.accountId)
        throw new Error("Recommendation event belongs to another account");
      if (JSON.stringify(existing) !== JSON.stringify(input))
        throw new Error("Recommendation event idempotency conflict");
      return {
        status: "replayed",
        event: {
          ...existing,
          sourceEvidenceRefs: [...existing.sourceEvidenceRefs],
        },
      };
    }
    this.events.set(input.idempotencyKey, input);
    return {
      status: "created",
      event: { ...input, sourceEvidenceRefs: [...input.sourceEvidenceRefs] },
    };
  }
}

export async function inspectRecommendationEvidenceStorage(pool: {
  query: (sql: string) => Promise<{
    rows: Array<{ signal_table: string | null; event_table: string | null }>;
  }>;
}): Promise<RecommendationEvidenceStorageReadiness> {
  const result = await pool.query(
    `select to_regclass('public.${RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT.signalTable}') as signal_table,
            to_regclass('public.${RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT.eventTable}') as event_table`,
  );
  const signalTablePresent = Boolean(result.rows[0]?.signal_table);
  const eventTablePresent = Boolean(result.rows[0]?.event_table);
  return {
    status: signalTablePresent && eventTablePresent ? "ready" : "unavailable",
    schemaVersion: RECOMMENDATION_EVIDENCE_STORAGE_SCHEMA_VERSION,
    signalTablePresent,
    eventTablePresent,
    warnings:
      signalTablePresent && eventTablePresent
        ? []
        : [
            "Recommendation evidence tables are not deployed; do not persist recommendation authority or personalize serving.",
          ],
  };
}
