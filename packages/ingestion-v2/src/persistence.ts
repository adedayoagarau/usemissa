import pg, { type Pool as PgPool, type PoolClient } from "pg";
import { classifyIngestionFailure, INGESTION_V2_VERSION, type ExtractionResult, type IngestionFailureCode, type IngestionRun, type PageSnapshot, type SourceDefinition } from "./contracts.js";
import type { PublisherReview } from "./publisher.js";
import { UNCHANGED_ROOT_WARNING, type ShadowArtifact, type ShadowRunStore } from "./execution.js";

const { Pool } = pg;

export const ingestionV2Schema = `
create table if not exists missa_ingestion_v2_runs (
  id text primary key,
  source_id text not null,
  trigger text not null check (trigger in ('manual', 'scheduled', 'backfill', 'shadow')),
  mode text not null check (mode in ('shadow', 'review', 'promote')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null,
  completed_at timestamptz,
  error text,
  failure_code text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists missa_ingestion_v2_runs_source_idx on missa_ingestion_v2_runs(source_id, created_at desc);
create table if not exists missa_ingestion_v2_snapshots (
  id text primary key,
  run_id text not null references missa_ingestion_v2_runs(id) on delete cascade,
  source_id text not null,
  url text not null,
  final_url text not null,
  fetched_at timestamptz not null,
  status_code integer not null,
  content_type text,
  content_hash text not null,
  html text not null,
  rendered boolean not null default false,
  is_root boolean not null default false
);
create index if not exists missa_ingestion_v2_snapshots_run_idx on missa_ingestion_v2_snapshots(run_id);
create table if not exists missa_ingestion_v2_extractions (
  id text primary key,
  snapshot_id text not null references missa_ingestion_v2_snapshots(id) on delete cascade,
  field_name text not null,
  raw_value text,
  normalized_value jsonb,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  provenance jsonb not null
);
create index if not exists missa_ingestion_v2_extractions_snapshot_idx on missa_ingestion_v2_extractions(snapshot_id);
create table if not exists missa_ingestion_v2_artifacts (
  run_id text primary key references missa_ingestion_v2_runs(id) on delete cascade,
  candidate_links jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  quality jsonb not null default '{"decision":"reject","score":0,"reasons":["quality not assessed"]}'::jsonb,
  publisher jsonb,
  created_at timestamptz not null default now()
);
alter table missa_ingestion_v2_artifacts add column if not exists quality jsonb not null default '{"decision":"reject","score":0,"reasons":["quality not assessed"]}'::jsonb;
alter table missa_ingestion_v2_artifacts add column if not exists publisher jsonb;
alter table missa_ingestion_v2_runs add column if not exists failure_code text;
alter table missa_ingestion_v2_snapshots add column if not exists is_root boolean not null default false;
create table if not exists missa_ingestion_v2_source_schedules (
  source_id text primary key,
  lane text not null check (lane in ('core-daily', 'scheduled', 'single-run', 'held')),
  cadence_hours integer not null check (cadence_hours > 0),
  open_from timestamptz,
  open_until timestamptz,
  timezone text,
  next_run_at timestamptz,
  last_enqueued_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists missa_ingestion_v2_source_schedules_due_idx on missa_ingestion_v2_source_schedules(lane, next_run_at);
`;

export async function ensureIngestionV2Schema(pool: PgPool): Promise<void> {
  await pool.query(ingestionV2Schema);
}

const REQUIRED_INGESTION_V2_TABLES = [
  "missa_ingestion_v2_runs",
  "missa_ingestion_v2_snapshots",
  "missa_ingestion_v2_extractions",
  "missa_ingestion_v2_artifacts",
  "missa_ingestion_v2_source_schedules",
] as const;

/** Read-only startup check. Long-running workers must never apply DDL implicitly. */
export async function assertIngestionV2SchemaReady(pool: PgPool): Promise<void> {
  const result = await pool.query<{ table_name: string; relation: string | null }>(
    `select table_name, to_regclass(table_name)::text as relation
     from unnest($1::text[]) as required(table_name)`,
    [[...REQUIRED_INGESTION_V2_TABLES]],
  );
  const missing = result.rows.filter((row) => row.relation === null).map((row) => row.table_name);
  if (missing.length) throw new Error(`Ingestion v2 schema is not ready; missing ${missing.join(", ")}. Run the explicitly gated schema:ensure command first.`);
  const columns = await pool.query<{ table_name: string; column_name: string }>(
    `select required.table_name, required.column_name
     from (values
       ('missa_ingestion_v2_runs', 'failure_code'),
       ('missa_ingestion_v2_snapshots', 'is_root'),
       ('missa_ingestion_v2_artifacts', 'quality'),
       ('missa_ingestion_v2_artifacts', 'publisher'),
       ('missa_ingestion_v2_source_schedules', 'next_run_at')
     ) as required(table_name, column_name)
     left join information_schema.columns deployed
       on deployed.table_schema = current_schema()
      and deployed.table_name = required.table_name
      and deployed.column_name = required.column_name
     where deployed.column_name is null`,
  );
  if (columns.rows.length) throw new Error(`Ingestion v2 schema is not ready; missing ${columns.rows.map((row) => `${row.table_name}.${row.column_name}`).join(", ")}. Run the explicitly gated schema:ensure command first.`);
}

export async function syncIngestionV2Schedules(pool: PgPool, sources: SourceDefinition[]): Promise<void> {
  for (const source of sources) {
    const schedule = source.schedule;
    await pool.query(
      `insert into missa_ingestion_v2_source_schedules (source_id, lane, cadence_hours, open_from, open_until, timezone, next_run_at)
       values ($1,$2,$3,$4,$5,$6,case when $2 in ('core-daily','scheduled') then now() else null end)
       on conflict (source_id) do update set lane=excluded.lane, cadence_hours=excluded.cadence_hours,
       open_from=excluded.open_from, open_until=excluded.open_until, timezone=excluded.timezone, updated_at=now()`,
      [source.id, schedule.lane, Math.max(1, Math.trunc(schedule.cadenceHours)), schedule.openFrom ?? null, schedule.openUntil ?? null, schedule.timezone ?? null],
    );
  }
}

export async function claimDueIngestionV2Schedules(pool: PgPool, limit = 25, sourceIds?: readonly string[]): Promise<string[]> {
  if (sourceIds?.length === 0) return [];
  const client = await pool.connect();
  try {
    await client.query("begin");
    const rows = await client.query<{ source_id: string }>(
      `select source_id from missa_ingestion_v2_source_schedules
       where lane in ('core-daily','scheduled') and (next_run_at is null or next_run_at <= now())
       and (open_from is null or open_from <= now()) and (open_until is null or open_until >= now())
       and ($2::text[] is null or source_id = any($2::text[]))
       order by next_run_at nulls first, source_id limit $1 for update skip locked`, [Math.min(Math.max(limit, 1), 100), sourceIds ? [...sourceIds] : null]);
    for (const row of rows.rows) {
      await client.query(
        `update missa_ingestion_v2_source_schedules set last_enqueued_at=now(), next_run_at=now() + (cadence_hours || ' hours')::interval, updated_at=now() where source_id=$1`,
        [row.source_id],
      );
    }
    await client.query("commit");
    return rows.rows.map((row) => row.source_id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export interface IngestionV2SourceRefreshHistory {
  consecutiveUnchangedRuns: number;
  consecutiveFailures: number;
}

export async function readIngestionV2SourceRefreshHistory(pool: PgPool, sourceId: string, limit = 25): Promise<IngestionV2SourceRefreshHistory> {
  const result = await pool.query<{ status: IngestionRun["status"]; warnings: unknown }>(
    `select r.status, coalesce(a.warnings, '[]'::jsonb) as warnings
     from missa_ingestion_v2_runs r
     left join missa_ingestion_v2_artifacts a on a.run_id = r.id
     where r.source_id = $1 and r.status in ('completed', 'failed')
     order by r.created_at desc, r.id desc
     limit $2`,
    [sourceId, Math.min(Math.max(Math.trunc(limit), 1), 100)],
  );
  let consecutiveFailures = 0;
  for (const row of result.rows) {
    if (row.status !== "failed") break;
    consecutiveFailures += 1;
  }
  let consecutiveUnchangedRuns = 0;
  for (const row of result.rows) {
    const warnings = Array.isArray(row.warnings) ? row.warnings : [];
    if (row.status !== "completed" || !warnings.includes(UNCHANGED_ROOT_WARNING)) break;
    consecutiveUnchangedRuns += 1;
  }
  return { consecutiveUnchangedRuns, consecutiveFailures };
}

export async function rescheduleIngestionV2Source(pool: PgPool, sourceId: string, cadenceHours: number): Promise<void> {
  const boundedCadenceHours = Math.min(Math.max(Math.trunc(cadenceHours), 1), 24 * 30);
  const result = await pool.query(
    `update missa_ingestion_v2_source_schedules
     set next_run_at = now() + ($2::integer * interval '1 hour'), updated_at = now()
     where source_id = $1`,
    [sourceId, boundedCadenceHours],
  );
  if (result.rowCount !== 1) throw new Error(`Unknown ingestion v2 schedule: ${sourceId}`);
}

function json(value: unknown): string {
  return JSON.stringify(value === undefined ? null : value);
}

export class PostgresShadowRunStore implements ShadowRunStore {
  constructor(private readonly pool: PgPool) {}

  async latestRootContentHash(sourceId: string, processingVersion: string): Promise<string | undefined> {
    const result = await this.pool.query<{ content_hash: string }>(
      `select s.content_hash from missa_ingestion_v2_snapshots s
       join missa_ingestion_v2_runs r on r.id = s.run_id
       join missa_ingestion_v2_artifacts a on a.run_id = r.id
       where s.source_id = $1 and s.is_root = true and r.status = 'completed'
         and a.publisher->>'pipelineVersion' = $2
       order by s.fetched_at desc, s.id desc limit 1`,
      [sourceId, processingVersion],
    );
    return result.rows[0]?.content_hash;
  }

  async save(artifact: ShadowArtifact): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await this.saveRun(client, artifact.run);
      for (const [index, snapshot] of [artifact.snapshot, ...(artifact.relatedSnapshots ?? [])].entries()) {
        await client.query(
        `insert into missa_ingestion_v2_snapshots (id, run_id, source_id, url, final_url, fetched_at, status_code, content_type, content_hash, html, rendered, is_root)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         on conflict (id) do update set final_url=excluded.final_url, fetched_at=excluded.fetched_at, status_code=excluded.status_code, content_type=excluded.content_type, content_hash=excluded.content_hash, html=excluded.html, rendered=excluded.rendered, is_root=excluded.is_root`,
        [snapshot.id, snapshot.runId, snapshot.sourceId, snapshot.url, snapshot.finalUrl, snapshot.fetchedAt, snapshot.statusCode, snapshot.contentType, snapshot.contentHash, snapshot.html, snapshot.rendered, index === 0],
        );
      }
      for (const [index, field] of artifact.extraction.fields.entries()) {
        const snapshotId = [artifact.snapshot, ...(artifact.relatedSnapshots ?? [])].some((snapshot) => snapshot.id === field.provenance.snapshotId) ? field.provenance.snapshotId : artifact.snapshot.id;
        await client.query(
          `insert into missa_ingestion_v2_extractions (id, snapshot_id, field_name, raw_value, normalized_value, confidence, provenance)
           values ($1,$2,$3,$4,$5,$6,$7)
           on conflict (id) do update set raw_value=excluded.raw_value, normalized_value=excluded.normalized_value, confidence=excluded.confidence, provenance=excluded.provenance`,
          [`${snapshotId}:${field.fieldName}:${index}`, snapshotId, field.fieldName, field.rawValue, json(field.normalizedValue), field.confidence, json(field.provenance)],
        );
      }
      await client.query(
         `insert into missa_ingestion_v2_artifacts (run_id, candidate_links, warnings, published, quality, publisher)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (run_id) do update set candidate_links=excluded.candidate_links, warnings=excluded.warnings, published=excluded.published, quality=excluded.quality, publisher=excluded.publisher`,
        [artifact.run.id, json(artifact.extraction.candidateLinks), json(artifact.extraction.warnings), artifact.published, json(artifact.quality), json(artifact.publisher)],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async saveFailure(run: IngestionRun, error: string, code = classifyIngestionFailure(error)): Promise<void> {
    await this.pool.query(
      `insert into missa_ingestion_v2_runs (id, source_id, trigger, mode, status, created_at, completed_at, error, failure_code)
       values ($1,$2,$3,$4,$5,$6,now(),$7,$8)
       on conflict (id) do update set status=excluded.status, completed_at=excluded.completed_at, error=excluded.error, failure_code=excluded.failure_code`,
      [run.id, run.sourceId, run.trigger, run.mode, run.status, run.createdAt, error, code],
    );
  }

  async get(runId: string): Promise<ShadowArtifact | undefined> {
    const result = await this.pool.query<{
      id: string; source_id: string; trigger: IngestionRun["trigger"]; mode: IngestionRun["mode"]; status: IngestionRun["status"]; created_at: Date;
      candidate_links: ExtractionResult["candidateLinks"]; warnings: string[]; published: boolean; quality: ShadowArtifact["quality"]; publisher: PublisherReview | null;
    }>(`select r.id, r.source_id, r.trigger, r.mode, r.status, r.created_at, a.candidate_links, a.warnings, a.published, a.quality, a.publisher
        from missa_ingestion_v2_runs r join missa_ingestion_v2_artifacts a on a.run_id = r.id where r.id = $1`, [runId]);
    const row = result.rows[0];
    if (!row) return undefined;
    const snapshotsResult = await this.pool.query<{
      id: string; run_id: string; source_id: string; url: string; final_url: string; fetched_at: Date; status_code: number; content_type: string | null; content_hash: string; html: string; rendered: boolean; is_root: boolean;
    }>(`select id, run_id, source_id, url, final_url, fetched_at, status_code, content_type, content_hash, html, rendered, is_root
        from missa_ingestion_v2_snapshots where run_id = $1 order by is_root desc, fetched_at asc, id`, [runId]);
    const snapshots = snapshotsResult.rows.map((snapshot) => ({ id: snapshot.id, runId: snapshot.run_id, sourceId: snapshot.source_id, url: snapshot.url, finalUrl: snapshot.final_url, fetchedAt: snapshot.fetched_at.toISOString(), statusCode: snapshot.status_code, contentType: snapshot.content_type, contentHash: snapshot.content_hash, html: snapshot.html, rendered: snapshot.rendered }));
    const root = snapshots[0];
    if (!root) return undefined;
    const fields = await this.pool.query<ExtractionResult["fields"][number]>(
      `select field_name as "fieldName", raw_value as "rawValue", normalized_value as "normalizedValue", confidence, provenance
       from missa_ingestion_v2_extractions where snapshot_id = any($1::text[]) order by id`, [snapshots.map((snapshot) => snapshot.id)],
    );
    return {
      run: { id: row.id, sourceId: row.source_id, trigger: row.trigger, mode: row.mode, status: row.status, createdAt: row.created_at.toISOString() },
      snapshot: root,
      relatedSnapshots: snapshots.slice(1),
      extraction: { fields: fields.rows, candidateLinks: row.candidate_links, warnings: row.warnings },
      quality: row.quality,
      publisher: row.publisher ?? undefined,
      published: row.published as false,
    };
  }

  private async saveRun(client: PoolClient, run: IngestionRun): Promise<void> {
    await client.query(
      `insert into missa_ingestion_v2_runs (id, source_id, trigger, mode, status, created_at, completed_at)
       values ($1,$2,$3,$4,$5,$6,case when $5 in ('completed','failed','cancelled') then now() else null end)
       on conflict (id) do update set status=excluded.status, completed_at=excluded.completed_at`,
      [run.id, run.sourceId, run.trigger, run.mode, run.status, run.createdAt],
    );
  }
}

export async function readRecentCandidateArtifacts(
  pool: PgPool,
  sourceId: string,
  limit = 2,
): Promise<ShadowArtifact[]> {
  const runs = await pool.query<{ id: string }>(
    `select r.id from missa_ingestion_v2_runs r
     join missa_ingestion_v2_artifacts a on a.run_id = r.id
     where r.source_id = $1
       and r.status = 'completed'
       and a.publisher->>'pipelineVersion' = $2
       and jsonb_array_length(coalesce(a.publisher->'candidateReviews', '[]'::jsonb)) > 0
     order by r.created_at desc, r.id desc
     limit $3`,
    [sourceId, INGESTION_V2_VERSION, Math.min(Math.max(Math.trunc(limit), 2), 10)],
  );
  const store = new PostgresShadowRunStore(pool);
  const artifacts = await Promise.all(runs.rows.map((row) => store.get(row.id)));
  return artifacts.filter((artifact): artifact is ShadowArtifact => Boolean(artifact)).reverse();
}

export function createIngestionV2Pool(databaseUrl = process.env.DATABASE_URL): PgPool {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for durable ingestion v2 persistence");
  return new Pool({ connectionString: databaseUrl, max: 4 });
}

export interface IngestionV2RunSummary {
  id: string;
  sourceId: string;
  trigger: string;
  mode: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
    error: string | null;
    failureCode: string | null;
  snapshotCount: number;
  fieldCount: number;
  published: boolean;
  qualityDecision: string;
  qualityScore: number;
}

export async function readRecentIngestionV2Runs(pool: PgPool, limit = 50): Promise<IngestionV2RunSummary[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const result = await pool.query<{
    id: string; source_id: string; trigger: string; mode: string; status: string; created_at: Date; completed_at: Date | null; error: string | null;
    snapshot_count: string; field_count: string; published: boolean; quality_decision: string | null; quality_score: string | null; failure_code: string | null;
  }>(
    `select r.id, r.source_id, r.trigger, r.mode, r.status, r.created_at, r.completed_at, r.error, r.failure_code,
            count(distinct s.id)::text as snapshot_count,
            count(distinct e.id)::text as field_count,
            coalesce(bool_or(a.published), false) as published,
            coalesce(max(a.quality->>'decision'), 'reject') as quality_decision,
            coalesce(max(a.quality->>'score'), '0') as quality_score
     from missa_ingestion_v2_runs r
     left join missa_ingestion_v2_snapshots s on s.run_id = r.id
     left join missa_ingestion_v2_extractions e on e.snapshot_id = s.id
     left join missa_ingestion_v2_artifacts a on a.run_id = r.id
     group by r.id
     order by r.created_at desc
     limit $1`, [boundedLimit],
  );
  return result.rows.map((row) => ({
    id: row.id, sourceId: row.source_id, trigger: row.trigger, mode: row.mode, status: row.status,
    createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null, error: row.error, failureCode: row.failure_code,
    snapshotCount: Number(row.snapshot_count), fieldCount: Number(row.field_count), published: row.published,
    qualityDecision: row.quality_decision ?? "reject", qualityScore: Number(row.quality_score ?? 0),
  }));
}
