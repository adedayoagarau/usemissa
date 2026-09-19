import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import {
  OpportunityRevalidationRequiredError,
  OpportunityVersionHeadMissingError,
  saveCanonicalOpportunityToTrackerGuarded,
  setOpportunityVersionHead,
  type FirstSaveProvenance,
} from "../src/index.js";

const databaseUrl = process.env.DATABASE_URL;

async function relationalSchemaReady(pool: Pool): Promise<boolean> {
  const result = await pool.query(
    `select
       to_regclass('opportunities') as opportunities,
       to_regclass('opportunity_sources') as opportunity_sources,
       to_regclass('opportunity_versions') as opportunity_versions,
       to_regclass('opportunity_version_heads') as opportunity_version_heads,
       to_regclass('radar_accounts') as radar_accounts,
       to_regclass('tracked_opportunities') as tracked_opportunities,
       to_regclass('tracked_status_events') as tracked_status_events,
       to_regclass('recommendation_signal_records') as recommendation_signal_records`,
  );
  const row = result.rows[0] as Record<string, string | null>;
  return Object.values(row).every(Boolean);
}

async function cleanup(
  pool: Pool,
  ids: { accountId: string; opportunityId: string; sourceId: string },
): Promise<void> {
  await pool.query(
    `delete from recommendation_signal_records where account_id = $1 and opportunity_id = $2`,
    [ids.accountId, ids.opportunityId],
  ).catch(() => undefined);
  await pool.query(
    `delete from radar_accounts where id = $1`,
    [ids.accountId],
  ).catch(() => undefined);
  await pool.query(
    `delete from opportunities where id = $1`,
    [ids.opportunityId],
  ).catch(() => undefined);
  await pool.query(
    `delete from opportunity_sources where id = $1`,
    [ids.sourceId],
  ).catch(() => undefined);
}

async function fixture(
  pool: Pool,
  prefix: string,
  options: { head?: { versionId: string; fingerprint: string } } = {},
): Promise<{
  accountId: string;
  opportunityId: string;
  sourceId: string;
  versionId: string;
  fingerprint: string;
}> {
  const accountId = `${prefix}:account`;
  const opportunityId = `${prefix}:opportunity`;
  const sourceId = `${prefix}:source`;
  const versionId = `${prefix}:version:v1`;
  const evidenceId = `${prefix}:evidence`;
  await pool.query(
    `insert into radar_accounts (id, email, data) values ($1, $2, '{}'::jsonb)`,
    [accountId, `${prefix}@example.invalid`],
  );
  await pool.query(
    `insert into opportunity_sources (id, name, url, kind) values ($1, $2, $3, 'organization')`,
    [sourceId, `${prefix} source`, `https://example.invalid/${prefix}`],
  );
  // Insert as reviewable first so the deferred publication gate can be
  // satisfied after the evidence and content rows are committed, then publish.
  await pool.query(
    `insert into opportunities
       (id, slug, title, source_id, status, publication_state, type, deadline_kind, fee_status, submission_url)
     values ($1, $2, $3, $4, 'open', 'reviewable', 'grant', 'rolling', 'unknown', $5)`,
    [opportunityId, `${prefix}-slug`, `${prefix} opportunity`, sourceId, `https://example.invalid/${prefix}/submit`],
  );
  await pool.query(
    `insert into opportunity_source_evidence
       (id, opportunity_id, source_id, kind, name, url, checked_at, processing_succeeded_at, organization_confirmed, destination_reconciled)
     values ($1, $2, $3, 'source', $4, $5, now(), now(), true, true)`,
    [evidenceId, opportunityId, sourceId, `${prefix} evidence`, `https://example.invalid/${prefix}/source`],
  );
  await pool.query(
    `insert into opportunity_contents
       (opportunity_id, input_version, builder_version, content, review_status)
     values ($1, 'v1', 'v1', '{}'::jsonb, 'approved')`,
    [opportunityId],
  );
  await pool.query(
    `update opportunities set publication_state = 'published' where id = $1`,
    [opportunityId],
  );
  await pool.query(
    `insert into opportunity_versions (id, opportunity_id, fields, created_at)
     values ($1, $2, '{}'::jsonb, now())`,
    [versionId, opportunityId],
  );
  const fingerprint = options.head?.fingerprint ?? `${prefix}:fingerprint:v1`;
  const headVersionId = options.head?.versionId ?? versionId;
  if (options.head) {
    await pool.query(
      `insert into opportunity_versions (id, opportunity_id, fields, created_at)
       values ($1, $2, '{}'::jsonb, now() + interval '1 second')`,
      [options.head.versionId, opportunityId],
    );
  }
  await setOpportunityVersionHead(pool, {
    opportunityId,
    versionId: headVersionId,
    publicationState: "published",
    safetyState: "clear",
    materialFingerprint: fingerprint,
  });
  return { accountId, opportunityId, sourceId, versionId, fingerprint };
}

function signal(overrides: Partial<FirstSaveProvenance> = {}): FirstSaveProvenance {
  return {
    accountId: "unset",
    opportunityId: "unset",
    opportunityVersionId: "unset",
    opportunitySourceSnapshot: {
      sourceId: "source",
      url: "https://example.invalid/source",
      authority: "official-organization",
      observedAt: "2026-09-18T00:00:00.000Z",
    },
    taxonomyVersion: 1,
    taxonomyAssignmentIds: ["writing.poetry"],
    sourceEvidenceRefs: ["source:ref"],
    eligibilityRuleIds: ["rule:ref"],
    safetyState: "clear",
    safetyAuthority: "publication-review",
    safetyDecisionId: "decision",
    safetyEvidenceRefs: ["review:decision"],
    intentFingerprint: "intent:v1",
    revalidatedAt: "2026-09-18T00:01:00.000Z",
    undoState: "active",
    ...overrides,
  };
}

test(
  "guarded First-Save creates tracker, history, and signal atomically when the head matches",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const prefix = `vh_create_${Date.now()}`;
    let ids: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      if (!(await relationalSchemaReady(pool))) return;
      ids = await fixture(pool, prefix);
      const result = await saveCanonicalOpportunityToTrackerGuarded(
        databaseUrl!,
        ids.accountId,
        ids.opportunityId,
        {
          guard: {
            observedVersionId: ids.versionId,
            observedMaterialFingerprint: ids.fingerprint,
          },
          signal: signal({
            accountId: ids.accountId,
            opportunityId: ids.opportunityId,
            opportunityVersionId: ids.versionId,
          }),
        },
      );
      assert.equal(result?.status, "created");
      assert.equal(result?.tracked.revision, 1);

      const tracked = await pool.query(
        `select * from tracked_opportunities where account_id = $1 and opportunity_id = $2`,
        [ids.accountId, ids.opportunityId],
      );
      assert.equal(tracked.rowCount, 1);
      const history = await pool.query(
        `select * from tracked_status_events where tracked_opportunity_id = $1`,
        [tracked.rows[0].id],
      );
      assert.equal(history.rowCount, 1);
      const evidence = await pool.query(
        `select * from recommendation_signal_records where account_id = $1 and opportunity_id = $2`,
        [ids.accountId, ids.opportunityId],
      );
      assert.equal(evidence.rowCount, 1);
      assert.equal(evidence.rows[0].opportunity_version_id, ids.versionId);
      assert.equal(evidence.rows[0].tracker_id, tracked.rows[0].id);
    } finally {
      if (ids) await cleanup(pool, ids);
      await pool.end();
    }
  },
);

test(
  "guarded First-Save fails without writes when the head version moved",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const prefix = `vh_stale_${Date.now()}`;
    let ids: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      if (!(await relationalSchemaReady(pool))) return;
      ids = await fixture(pool, prefix);
      await pool.query(
        `insert into opportunity_versions (id, opportunity_id, fields, created_at)
         values ($1, $2, '{}'::jsonb, now())`,
        [`${prefix}:version:v2`, ids.opportunityId],
      );
      await setOpportunityVersionHead(pool, {
        opportunityId: ids.opportunityId,
        versionId: `${prefix}:version:v2`,
        publicationState: "published",
        safetyState: "clear",
        materialFingerprint: `${prefix}:fingerprint:v2`,
      });

      await assert.rejects(
        saveCanonicalOpportunityToTrackerGuarded(
          databaseUrl!,
          ids.accountId,
          ids.opportunityId,
          {
            guard: {
              observedVersionId: ids.versionId,
              observedMaterialFingerprint: ids.fingerprint,
            },
          },
        ),
        (error: unknown) => error instanceof OpportunityRevalidationRequiredError,
      );

      const tracked = await pool.query(
        `select count(*)::int as count from tracked_opportunities where account_id = $1`,
        [ids.accountId],
      );
      assert.equal(tracked.rows[0].count, 0);
      const evidence = await pool.query(
        `select count(*)::int as count from recommendation_signal_records where account_id = $1`,
        [ids.accountId],
      );
      assert.equal(evidence.rows[0].count, 0);
    } finally {
      if (ids) await cleanup(pool, ids);
      await pool.end();
    }
  },
);

test(
  "guarded First-Save fails without writes when no head exists",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const prefix = `vh_missing_${Date.now()}`;
    let ids: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      if (!(await relationalSchemaReady(pool))) return;
      ids = await fixture(pool, prefix);
      await pool.query(
        `delete from opportunity_version_heads where opportunity_id = $1`,
        [ids.opportunityId],
      );

      await assert.rejects(
        saveCanonicalOpportunityToTrackerGuarded(
          databaseUrl!,
          ids.accountId,
          ids.opportunityId,
          {
            guard: {
              observedVersionId: ids.versionId,
              observedMaterialFingerprint: ids.fingerprint,
            },
          },
        ),
        (error: unknown) => error instanceof OpportunityVersionHeadMissingError,
      );

      const tracked = await pool.query(
        `select count(*)::int as count from tracked_opportunities where account_id = $1`,
        [ids.accountId],
      );
      assert.equal(tracked.rows[0].count, 0);
    } finally {
      if (ids) await cleanup(pool, ids);
      await pool.end();
    }
  },
);

test(
  "guarded First-Save serializes against a concurrent head correction",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    const prefix = `vh_race_${Date.now()}`;
    let ids: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      if (!(await relationalSchemaReady(pool))) return;
      ids = await fixture(pool, prefix);
      const nextVersion = `${prefix}:version:v2`;
      await pool.query(
        `insert into opportunity_versions (id, opportunity_id, fields, created_at)
         values ($1, $2, '{}'::jsonb, now() + interval '1 second')`,
        [nextVersion, ids.opportunityId],
      );

      // A concurrent canonical writer advances the head while holding the row
      // lock. The guarded save must block, then observe the new head and fail
      // closed against the stale observation.
      const writer = await pool.connect();
      await writer.query("BEGIN");
      await writer.query(
        `update opportunity_version_heads
           set version_id = $2, material_fingerprint = $3, canonical_at = now()
         where opportunity_id = $1`,
        [ids.opportunityId, nextVersion, `${prefix}:fingerprint:v2`],
      );

      const save = saveCanonicalOpportunityToTrackerGuarded(
        databaseUrl!,
        ids.accountId,
        ids.opportunityId,
        {
          guard: {
            observedVersionId: ids.versionId,
            observedMaterialFingerprint: ids.fingerprint,
          },
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      await writer.query("COMMIT");
      writer.release();

      await assert.rejects(
        save,
        (error: unknown) => error instanceof OpportunityRevalidationRequiredError,
      );
      const tracked = await pool.query(
        `select count(*)::int as count from tracked_opportunities where account_id = $1`,
        [ids.accountId],
      );
      assert.equal(tracked.rows[0].count, 0);
    } finally {
      if (ids) await cleanup(pool, ids);
      await pool.end();
    }
  },
);
