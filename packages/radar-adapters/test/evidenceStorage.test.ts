import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryRecommendationEvidenceStore,
  RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT,
  createRecommendationSignalRecord,
  inspectRecommendationEvidenceStorage,
} from "../src/index.js";
import type {
  FirstSaveProvenance,
  RecommendationEvidenceRecord,
} from "../src/index.js";

const provenance: FirstSaveProvenance = {
  accountId: "acct_storage",
  opportunityId: "opp_storage",
  opportunityVersionId: "opp_storage:v1",
  opportunitySourceSnapshot: {
    sourceId: "source_storage",
    url: "https://example.test/storage",
    authority: "official-organization",
    observedAt: "2026-08-20T00:00:00.000Z",
  },
  taxonomyVersion: 1,
  taxonomyAssignmentIds: ["writing.poetry"],
  sourceEvidenceRefs: ["source:storage"],
  eligibilityRuleIds: [],
  safetyState: "clear",
  safetyAuthority: "publication-review",
  safetyDecisionId: "decision_storage",
  safetyEvidenceRefs: ["review:decision_storage"],
  intentFingerprint: "intent_storage_v1",
  revalidatedAt: "2026-08-20T00:01:00.000Z",
  undoState: "active",
};

const event: RecommendationEvidenceRecord = {
  eventId: "event_storage",
  idempotencyKey: "event_storage_key",
  accountId: "acct_storage",
  feedId: "feed_storage",
  opportunityId: "opp_storage",
  opportunityVersionId: "opp_storage:v1",
  event: "served",
  ordinal: 0,
  policyVersion: "deterministic-fit-v1",
  featureVersion: "deterministic-fit-features-v1",
  eligibilityVersion: "deterministic-fit-gates-v1",
  sourceEvidenceRefs: ["source:storage"],
  occurredAt: "2026-08-20T00:02:00.000Z",
  ingestedAt: "2026-08-20T00:02:01.000Z",
};

test("recommendation storage contract keeps versioned provenance separate from analytics", () => {
  assert.equal(
    RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT.signalTable,
    "recommendation_signal_records",
  );
  assert.equal(
    RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT.eventTable,
    "recommendation_evidence_events",
  );
  assert.ok(
    !RECOMMENDATION_EVIDENCE_STORAGE_CONTRACT.signalTable.includes("analytics"),
  );
  const record = createRecommendationSignalRecord({
    provenance,
    createdAt: "2026-08-20T00:01:01.000Z",
  });
  assert.equal(record.opportunityVersionId, "opp_storage:v1");
  assert.equal(record.safetyDecisionId, "decision_storage");
  assert.equal(
    record.opportunitySourceSnapshot.url,
    "https://example.test/storage",
  );
});

test("in-memory contract is idempotent, account-bound, and undoable", async () => {
  const store = new InMemoryRecommendationEvidenceStore();
  const created = await store.putSignal({
    provenance,
    createdAt: "2026-08-20T00:01:01.000Z",
  });
  const replayed = await store.putSignal({
    provenance,
    createdAt: "2026-08-20T00:01:01.000Z",
  });
  assert.equal(created.status, "created");
  assert.equal(replayed.status, "replayed");
  assert.equal((await store.listActiveSignals("acct_storage")).length, 1);
  await assert.rejects(
    () => store.getSignal("acct_other", created.signal.signalId),
    /another account/,
  );
  const cleared = await store.clearSignal({
    accountId: "acct_storage",
    signalId: created.signal.signalId,
    clearedAt: "2026-08-20T01:00:00.000Z",
    reason: "creator-request",
  });
  assert.equal(cleared.active, false);
  assert.equal(cleared.retainHistoricalEvidence, true);
  assert.equal((await store.listActiveSignals("acct_storage")).length, 0);
  assert.equal(
    (await store.getSignal("acct_storage", created.signal.signalId))?.undoState,
    "cleared",
  );
});

test("event idempotency rejects conflicting or cross-account reuse", async () => {
  const store = new InMemoryRecommendationEvidenceStore();
  const created = await store.appendEvent(event);
  const replayed = await store.appendEvent({
    ...event,
    sourceEvidenceRefs: [...event.sourceEvidenceRefs],
  });
  assert.equal(created.status, "created");
  assert.equal(replayed.status, "replayed");
  await assert.rejects(
    () => store.appendEvent({ ...event, accountId: "acct_other" }),
    /another account/,
  );
  await assert.rejects(
    () => store.appendEvent({ ...event, eventId: "event_conflict" }),
    /idempotency conflict/,
  );
});

test("PostgreSQL readiness is read-only and fails closed when the contract is absent", async () => {
  const queries: string[] = [];
  const readiness = await inspectRecommendationEvidenceStorage({
    async query(sql: string) {
      queries.push(sql);
      return { rows: [{ signal_table: null, event_table: null }] };
    },
  });
  assert.equal(readiness.status, "unavailable");
  assert.equal(readiness.signalTablePresent, false);
  assert.equal(readiness.eventTablePresent, false);
  assert.equal(queries.length, 1);
  assert.match(queries[0]!, /to_regclass/);
  assert.doesNotMatch(queries[0]!, /insert|update|delete|create table/i);
});
