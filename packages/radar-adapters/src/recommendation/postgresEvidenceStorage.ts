import type { Pool } from "pg";
import type {
  FirstSaveProvenance,
  RecommendationEvidenceRecord,
} from "./provenance.js";
import {
  createRecommendationSignalRecord,
  recommendationSignalId,
  type RecommendationEvidenceStoragePort,
  type RecommendationSignalClearResult,
  type RecommendationSignalRecord,
  type RecommendationSignalRecordInput,
} from "./evidenceStorage.js";

interface SignalRow {
  signal_id: string;
  account_id: string;
  opportunity_id: string;
  opportunity_version_id: string;
  tracker_id: string | null;
  taxonomy_version: number | null;
  taxonomy_assignment_ids: string[];
  source_evidence_refs: string[];
  opportunity_source_snapshot: FirstSaveProvenance["opportunitySourceSnapshot"];
  eligibility_rule_ids: string[];
  safety_state: FirstSaveProvenance["safetyState"];
  safety_authority: FirstSaveProvenance["safetyAuthority"];
  safety_decision_id: string | null;
  safety_evidence_refs: string[];
  intent_fingerprint: string;
  revalidated_at: string;
  undo_state: FirstSaveProvenance["undoState"];
  created_at: string;
  cleared_at: string | null;
}

interface EventRow {
  event_id: string;
  idempotency_key: string;
  account_id: string;
  feed_id: string;
  opportunity_id: string;
  opportunity_version_id: string;
  event: RecommendationEvidenceRecord["event"];
  ordinal: number | null;
  policy_version: string;
  feature_version: string;
  taxonomy_version: number | null;
  eligibility_version: string;
  source_evidence_refs: string[];
  action: RecommendationEvidenceRecord["action"];
  occurred_at: string;
  ingested_at: string;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** JSON-stringify that is insensitive to object key order, for jsonb round-trips. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function signalRecordFromRow(row: SignalRow): RecommendationSignalRecord {
  const provenance: FirstSaveProvenance = {
    accountId: row.account_id,
    opportunityId: row.opportunity_id,
    opportunityVersionId: row.opportunity_version_id,
    ...(row.tracker_id ? { trackerId: row.tracker_id } : {}),
    opportunitySourceSnapshot: row.opportunity_source_snapshot,
    ...(row.taxonomy_version === null
      ? {}
      : { taxonomyVersion: row.taxonomy_version }),
    taxonomyAssignmentIds: row.taxonomy_assignment_ids ?? [],
    sourceEvidenceRefs: row.source_evidence_refs ?? [],
    eligibilityRuleIds: row.eligibility_rule_ids ?? [],
    safetyState: row.safety_state,
    ...(row.safety_authority === null
      ? {}
      : { safetyAuthority: row.safety_authority }),
    ...(row.safety_decision_id === null
      ? {}
      : { safetyDecisionId: row.safety_decision_id }),
    safetyEvidenceRefs: row.safety_evidence_refs ?? [],
    intentFingerprint: row.intent_fingerprint,
    revalidatedAt: iso(row.revalidated_at),
    undoState: row.undo_state,
  };
  return {
    ...provenance,
    signalId: row.signal_id,
    createdAt: iso(row.created_at),
    ...(row.cleared_at ? { clearedAt: iso(row.cleared_at) } : {}),
  };
}

function eventRecordFromRow(row: EventRow): RecommendationEvidenceRecord {
  return {
    eventId: row.event_id,
    idempotencyKey: row.idempotency_key,
    accountId: row.account_id,
    feedId: row.feed_id,
    opportunityId: row.opportunity_id,
    opportunityVersionId: row.opportunity_version_id,
    event: row.event,
    ...(row.ordinal === null ? {} : { ordinal: row.ordinal }),
    policyVersion: row.policy_version,
    featureVersion: row.feature_version,
    ...(row.taxonomy_version === null
      ? {}
      : { taxonomyVersion: row.taxonomy_version }),
    eligibilityVersion: row.eligibility_version,
    sourceEvidenceRefs: row.source_evidence_refs ?? [],
    ...(row.action === null ? {} : { action: row.action }),
    occurredAt: iso(row.occurred_at),
    ingestedAt: iso(row.ingested_at),
  };
}

function canonicalSignalJson(provenance: FirstSaveProvenance): string {
  return stableJson({
    opportunityId: provenance.opportunityId,
    opportunityVersionId: provenance.opportunityVersionId,
    trackerId: provenance.trackerId,
    taxonomyVersion: provenance.taxonomyVersion,
    taxonomyAssignmentIds: [...provenance.taxonomyAssignmentIds].sort(),
    sourceEvidenceRefs: [...provenance.sourceEvidenceRefs].sort(),
    opportunitySourceSnapshot: provenance.opportunitySourceSnapshot,
    eligibilityRuleIds: [...provenance.eligibilityRuleIds].sort(),
    safetyState: provenance.safetyState,
    safetyAuthority: provenance.safetyAuthority,
    safetyDecisionId: provenance.safetyDecisionId,
    safetyEvidenceRefs: [...provenance.safetyEvidenceRefs].sort(),
    intentFingerprint: provenance.intentFingerprint,
    revalidatedAt: provenance.revalidatedAt,
  });
}

function canonicalEventJson(event: RecommendationEvidenceRecord): string {
  return stableJson({
    feedId: event.feedId,
    opportunityId: event.opportunityId,
    opportunityVersionId: event.opportunityVersionId,
    event: event.event,
    ordinal: event.ordinal,
    policyVersion: event.policyVersion,
    featureVersion: event.featureVersion,
    taxonomyVersion: event.taxonomyVersion,
    eligibilityVersion: event.eligibilityVersion,
    sourceEvidenceRefs: [...event.sourceEvidenceRefs].sort(),
    action: event.action,
    occurredAt: event.occurredAt,
    ingestedAt: event.ingestedAt,
  });
}

/**
 * Durable PostgreSQL implementation of the recommendation evidence port. It
 * is not activated in serving by default; promotion stays behind the ADR-005
 * readiness gate. It is account-bound and idempotent, and clear/undo mutates
 * active state without deleting historical rows.
 */
export class PostgresRecommendationEvidenceStore
  implements RecommendationEvidenceStoragePort
{
  constructor(private readonly pool: Pool) {}

  async putSignal(
    input: RecommendationSignalRecordInput,
  ): Promise<{ status: "created" | "replayed"; signal: RecommendationSignalRecord }> {
    const signalId = input.signalId ?? recommendationSignalId(input.provenance);
    const p = input.provenance;
    const created = await this.pool.query<{ signal_id: string }>(
      `insert into recommendation_signal_records
         (signal_id, account_id, opportunity_id, opportunity_version_id, tracker_id,
          taxonomy_version, taxonomy_assignment_ids, source_evidence_refs,
          opportunity_source_snapshot, eligibility_rule_ids, safety_state,
          safety_authority, safety_decision_id, safety_evidence_refs,
          intent_fingerprint, revalidated_at, undo_state, created_at, cleared_at)
       values ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9::jsonb, $10::text[],
               $11, $12, $13, $14::text[], $15, $16, $17, $18, $19)
       on conflict (signal_id) do nothing
       returning signal_id`,
      [
        signalId,
        p.accountId,
        p.opportunityId,
        p.opportunityVersionId,
        p.trackerId ?? null,
        p.taxonomyVersion ?? null,
        p.taxonomyAssignmentIds,
        p.sourceEvidenceRefs,
        JSON.stringify(p.opportunitySourceSnapshot),
        p.eligibilityRuleIds,
        p.safetyState,
        p.safetyAuthority ?? null,
        p.safetyDecisionId ?? null,
        p.safetyEvidenceRefs,
        p.intentFingerprint,
        p.revalidatedAt,
        p.undoState,
        input.createdAt,
        null,
      ],
    );
    if (created.rowCount === 1) {
      return {
        status: "created",
        signal: createRecommendationSignalRecord({ signalId, provenance: p, createdAt: input.createdAt }),
      };
    }

    const existing = await this.readSignalRow(signalId);
    if (!existing) {
      throw new Error("Recommendation signal insert conflict without a stored row.");
    }
    if (existing.account_id !== p.accountId) {
      throw new Error("Recommendation signal belongs to another account");
    }
    const existingRecord = signalRecordFromRow(existing);
    if (
      canonicalSignalJson(stripRecord(existingRecord)) !== canonicalSignalJson(p)
    ) {
      throw new Error("Recommendation signal idempotency conflict");
    }
    return { status: "replayed", signal: existingRecord };
  }

  async getSignal(
    accountId: string,
    signalId: string,
  ): Promise<RecommendationSignalRecord | null> {
    const row = await this.readSignalRow(signalId);
    if (!row) return null;
    if (row.account_id !== accountId) {
      throw new Error("Recommendation signal belongs to another account");
    }
    return signalRecordFromRow(row);
  }

  async listActiveSignals(
    accountId: string,
  ): Promise<RecommendationSignalRecord[]> {
    const result = await this.pool.query<SignalRow>(
      `select * from recommendation_signal_records
       where account_id = $1 and undo_state = 'active' and cleared_at is null
       order by signal_id`,
      [accountId],
    );
    return result.rows.map(signalRecordFromRow);
  }

  async clearSignal(input: {
    accountId: string;
    signalId: string;
    clearedAt: string;
    reason: RecommendationSignalClearResult["reason"];
  }): Promise<RecommendationSignalClearResult> {
    const updated = await this.pool.query<SignalRow>(
      `update recommendation_signal_records
         set undo_state = 'cleared', cleared_at = $3
       where signal_id = $2 and account_id = $1
       returning *`,
      [input.accountId, input.signalId, input.clearedAt],
    );
    if (updated.rowCount !== 1) {
      throw new Error("Recommendation signal not found");
    }
    return {
      accountId: input.accountId,
      signalId: input.signalId,
      clearedAt: input.clearedAt,
      reason: input.reason,
      active: false,
      retainHistoricalEvidence: true,
    };
  }

  async appendEvent(
    input: RecommendationEvidenceRecord,
  ): Promise<{ status: "created" | "replayed"; event: RecommendationEvidenceRecord }> {
    const created = await this.pool.query<{ event_id: string }>(
      `insert into recommendation_evidence_events
         (event_id, idempotency_key, account_id, feed_id, opportunity_id,
          opportunity_version_id, event, ordinal, policy_version, feature_version,
          taxonomy_version, eligibility_version, source_evidence_refs, action,
          occurred_at, ingested_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14, $15, $16)
       on conflict (account_id, idempotency_key) do nothing
       returning event_id`,
      [
        input.eventId,
        input.idempotencyKey,
        input.accountId,
        input.feedId,
        input.opportunityId,
        input.opportunityVersionId,
        input.event,
        input.ordinal ?? null,
        input.policyVersion,
        input.featureVersion,
        input.taxonomyVersion ?? null,
        input.eligibilityVersion,
        input.sourceEvidenceRefs,
        input.action ?? null,
        input.occurredAt,
        input.ingestedAt,
      ],
    );
    if (created.rowCount === 1) {
      return { status: "created", event: { ...input, sourceEvidenceRefs: [...input.sourceEvidenceRefs] } };
    }

    const result = await this.pool.query<EventRow>(
      `select * from recommendation_evidence_events
       where account_id = $1 and idempotency_key = $2`,
      [input.accountId, input.idempotencyKey],
    );
    const existing = result.rows[0];
    if (!existing) {
      throw new Error("Recommendation event insert conflict without a stored row.");
    }
    const existingRecord = eventRecordFromRow(existing);
    if (canonicalEventJson(existingRecord) !== canonicalEventJson(input)) {
      throw new Error("Recommendation event idempotency conflict");
    }
    return { status: "replayed", event: existingRecord };
  }

  private async readSignalRow(signalId: string): Promise<SignalRow | undefined> {
    const result = await this.pool.query<SignalRow>(
      `select * from recommendation_signal_records where signal_id = $1`,
      [signalId],
    );
    return result.rows[0];
  }
}

function stripRecord(record: RecommendationSignalRecord): FirstSaveProvenance {
  const { signalId: _signalId, createdAt: _createdAt, clearedAt: _clearedAt, ...provenance } = record;
  return provenance;
}
