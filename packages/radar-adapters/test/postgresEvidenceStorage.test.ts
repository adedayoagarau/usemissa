import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { Pool } from "pg";
import {
  PostgresRecommendationEvidenceStore,
  inspectRecommendationEvidenceStorage,
  recommendationSignalId,
} from "../src/index.js";
import type {
  FirstSaveProvenance,
  RecommendationEvidenceRecord,
} from "../src/index.js";

const databaseUrl = process.env.DATABASE_URL;

async function ensureEvidenceSchema(pool: Pool): Promise<void> {
  // The migration is the single source of truth for these tables. Execute it
  // statement-by-statement (it is idempotent CREATE IF NOT EXISTS).
  const sql = readFileSync(
    join(process.cwd(), "..", "db", "migrations", "0075_recommendation_evidence.sql"),
    "utf8",
  );
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

function provenance(overrides: Partial<FirstSaveProvenance> = {}): FirstSaveProvenance {
  return {
    accountId: "acct_pg",
    opportunityId: "opp_pg",
    opportunityVersionId: "opp_pg:v1",
    opportunitySourceSnapshot: {
      sourceId: "source_pg",
      url: "https://example.test/pg",
      authority: "official-organization",
      observedAt: "2026-08-20T00:00:00.000Z",
    },
    taxonomyVersion: 1,
    taxonomyAssignmentIds: ["writing.poetry"],
    sourceEvidenceRefs: ["source:pg"],
    eligibilityRuleIds: ["rule:pg"],
    safetyState: "clear",
    safetyAuthority: "publication-review",
    safetyDecisionId: "decision_pg",
    safetyEvidenceRefs: ["review:decision_pg"],
    intentFingerprint: "intent_pg_v1",
    revalidatedAt: "2026-08-20T00:01:00.000Z",
    undoState: "active",
    ...overrides,
  };
}

function event(overrides: Partial<RecommendationEvidenceRecord> = {}): RecommendationEvidenceRecord {
  return {
    eventId: "event_pg",
    idempotencyKey: "event_pg_key",
    accountId: "acct_pg",
    feedId: "feed_pg",
    opportunityId: "opp_pg",
    opportunityVersionId: "opp_pg:v1",
    event: "served",
    ordinal: 0,
    policyVersion: "deterministic-fit-v1",
    featureVersion: "deterministic-fit-features-v1",
    eligibilityVersion: "deterministic-fit-gates-v1",
    sourceEvidenceRefs: ["source:pg"],
    occurredAt: "2026-08-20T00:02:00.000Z",
    ingestedAt: "2026-08-20T00:02:01.000Z",
    ...overrides,
  };
}

test(
  "Postgres recommendation evidence store is durable, idempotent, and account-bound",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const store = new PostgresRecommendationEvidenceStore(pool);
    const signalId = recommendationSignalId(provenance());
    const eventId = "event_pg";

    try {
      await ensureEvidenceSchema(pool);
      await pool.query(
        "delete from recommendation_evidence_events where account_id = 'acct_pg'",
      );
      await pool.query(
        "delete from recommendation_signal_records where account_id = 'acct_pg'",
      );

      const readiness = await inspectRecommendationEvidenceStorage(pool);
      assert.equal(readiness.status, "ready");

      const created = await store.putSignal({
        provenance: provenance(),
        createdAt: "2026-08-20T00:01:01.000Z",
      });
      assert.equal(created.status, "created");
      assert.equal(created.signal.signalId, signalId);

      const replayed = await store.putSignal({
        provenance: provenance(),
        createdAt: "2026-08-20T00:01:01.000Z",
      });
      assert.equal(replayed.status, "replayed");

      assert.equal((await store.listActiveSignals("acct_pg")).length, 1);
      await assert.rejects(
        () => store.getSignal("acct_other", signalId),
        /another account/,
      );

      // A conflicting payload with the same signal id must fail rather than relabel.
      await assert.rejects(
        () =>
          store.putSignal({
            provenance: provenance({ taxonomyAssignmentIds: ["writing.fiction"] }),
            createdAt: "2026-08-20T00:01:01.000Z",
          }),
        /idempotency conflict/,
      );

      const cleared = await store.clearSignal({
        accountId: "acct_pg",
        signalId,
        clearedAt: "2026-08-20T01:00:00.000Z",
        reason: "creator-request",
      });
      assert.equal(cleared.active, false);
      assert.equal(cleared.retainHistoricalEvidence, true);
      assert.equal((await store.listActiveSignals("acct_pg")).length, 0);
      assert.equal(
        (await store.getSignal("acct_pg", signalId))?.undoState,
        "cleared",
      );

      const createdEvent = await store.appendEvent(event());
      const replayedEvent = await store.appendEvent(event());
      assert.equal(createdEvent.status, "created");
      assert.equal(replayedEvent.status, "replayed");
      assert.equal(createdEvent.event.eventId, eventId);

      // Same idempotency key with different content must fail rather than relabel.
      await assert.rejects(
        () => store.appendEvent(event({ opportunityId: "opp_other" })),
        /idempotency conflict/,
      );
    } finally {
      await pool.query(
        "delete from recommendation_evidence_events where account_id = 'acct_pg'",
      );
      await pool.query(
        "delete from recommendation_signal_records where account_id = 'acct_pg'",
      );
      await pool.end();
    }
  },
);
