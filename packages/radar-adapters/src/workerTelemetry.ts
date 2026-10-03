import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { ensureAgentGraphSchema } from "./agentGraphSchema.js";

/** Long-lived Railway/container lanes that publish a durable liveness signal. */
export type RadarWorkerKind =
  | "radar-worker"
  | "research-worker"
  | "discovery-worker"
  | "source-promotion-worker"
  | "coverage-worker"
  | "taxonomy-discovery-worker"
  | "enrichment-worker"
  | "review-worker"
  | "content-worker"
  | "creator-worker";

export interface WorkerRunProgress {
  inputCount?: number;
  outputCount?: number;
  lastError?: string;
}

export interface SourceRunProgress {
  status?: "completed" | "failed" | "skipped";
  intervalStart?: string;
  intervalEnd?: string;
  sourcesSelected?: number;
  sourcesFetched?: number;
  successfulFetches?: number;
  failedFetches?: number;
  extractionSuccesses?: number;
  extractionFailures?: number;
  opportunitiesCreated?: number;
  opportunitiesUpdated?: number;
  duplicatesMerged?: number;
  retryCategories?: Record<string, number>;
  reconciliation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
}

export async function startSourceRun(
  pool: Pool,
  lane: string,
  agentRunId?: string,
  progress: Pick<SourceRunProgress, "intervalStart" | "metadata"> = {},
): Promise<string | undefined> {
  const id = randomUUID();
  try {
    await ensureAgentGraphSchema(pool);
    await pool.query(
      `insert into radar_source_runs (id, agent_run_id, lane, interval_start, metadata) values ($1, $2, $3, $4, $5::jsonb)`,
      [
        id,
        agentRunId ?? null,
        lane,
        progress.intervalStart ?? new Date().toISOString(),
        JSON.stringify(progress.metadata ?? {}),
      ],
    );
    return id;
  } catch {
    return undefined;
  }
}

export async function finishSourceRun(
  pool: Pool,
  runId: string | undefined,
  progress: SourceRunProgress,
): Promise<void> {
  if (!runId) return;
  try {
    await pool.query(
      `update radar_source_runs set status = $2, completed_at = now(), interval_end = $3, sources_selected = $4, sources_fetched = $5, successful_fetches = $6, failed_fetches = $7, extraction_successes = $8, extraction_failures = $9, opportunities_created = $10, opportunities_updated = $11, duplicates_merged = $12, retry_categories = $13::jsonb, reconciliation = $14::jsonb, metadata = metadata || $15::jsonb, error = $16 where id = $1`,
      [
        runId,
        progress.status ?? "completed",
        progress.intervalEnd ?? new Date().toISOString(),
        progress.sourcesSelected ?? 0,
        progress.sourcesFetched ?? 0,
        progress.successfulFetches ?? 0,
        progress.failedFetches ?? 0,
        progress.extractionSuccesses ?? 0,
        progress.extractionFailures ?? 0,
        progress.opportunitiesCreated ?? 0,
        progress.opportunitiesUpdated ?? 0,
        progress.duplicatesMerged ?? 0,
        JSON.stringify(progress.retryCategories ?? {}),
        JSON.stringify(progress.reconciliation ?? {}),
        JSON.stringify(progress.metadata ?? {}),
        progress.error?.slice(0, 1000) ?? null,
      ],
    );
  } catch {
    // Telemetry must never stop ingestion.
  }
}

export type WorkerRunLifecycleStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "missing";

function instanceId(): string | undefined {
  return (
    process.env.RAILWAY_REPLICA_ID ??
    process.env.RAILWAY_SERVICE_ID ??
    process.env.HOSTNAME
  );
}

function metadata(
  workerKind: RadarWorkerKind,
  progress: WorkerRunProgress = {},
): Record<string, unknown> {
  return {
    runType: "worker",
    workerKind,
    ...(instanceId() ? { instanceId: instanceId() } : {}),
    heartbeatAt: new Date().toISOString(),
    ...(progress.lastError
      ? { lastError: progress.lastError.slice(0, 500) }
      : {}),
  };
}

/**
 * Starts an append-only worker process record. Telemetry is deliberately
 * best-effort: a missing target schema must not stop the ingestion lane from
 * doing its primary work.
 */
export async function startWorkerRun(
  pool: Pool,
  workerKind: RadarWorkerKind,
): Promise<string | undefined> {
  const id = randomUUID();
  try {
    await ensureAgentGraphSchema(pool);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const queued = await client.query<{ id: string }>(
        `select id from radar_agent_runs
          where agent_kind = $1 and status = 'queued'
          order by started_at asc
          for update skip locked limit 1`,
        [workerKind],
      );
      if (queued.rows[0]) {
        await client.query(
          `update radar_agent_runs
              set status = 'running', heartbeat_at = now(), completed_at = null,
                  paused_at = null, cancelled_at = null, control_request_id = null,
                  metadata = metadata || $2::jsonb
            where id = $1`,
          [
            queued.rows[0].id,
            JSON.stringify({
              ...metadata(workerKind),
              claimedAt: new Date().toISOString(),
            }),
          ],
        );
        await client.query("commit");
        return queued.rows[0].id;
      }
      await client.query(
        `insert into radar_agent_runs
          (id, agent_kind, status, correlation_id, metadata)
         values ($1, $2, 'running', $1, $3::jsonb)`,
        [id, workerKind, JSON.stringify(metadata(workerKind))],
      );
      await client.query("commit");
      return id;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return undefined;
  }
}

export async function readWorkerRunLifecycle(
  pool: Pool,
  runId: string | undefined,
): Promise<WorkerRunLifecycleStatus> {
  if (!runId) return "missing";
  const result = await pool.query<{ status: WorkerRunLifecycleStatus }>(
    "select status from radar_agent_runs where id = $1",
    [runId],
  );
  return result.rows[0]?.status ?? "missing";
}

export async function heartbeatWorkerRun(
  pool: Pool,
  runId: string | undefined,
  workerKind: RadarWorkerKind,
  progress: WorkerRunProgress = {},
): Promise<void> {
  if (!runId) return;
  try {
    await pool.query(
      `update radar_agent_runs
       set heartbeat_at = now(),
           input_count = coalesce($2, input_count),
           output_count = coalesce($3, output_count),
           error = coalesce($4, error),
           metadata = metadata || $5::jsonb
       where id = $1 and status = 'running'`,
      [
        runId,
        progress.inputCount ?? null,
        progress.outputCount ?? null,
        progress.lastError?.slice(0, 500) ?? null,
        JSON.stringify(metadata(workerKind, progress)),
      ],
    );
  } catch {
    // Observability must not take down a productive worker tick.
  }
}

export async function finishWorkerRun(
  pool: Pool,
  runId: string | undefined,
  workerKind: RadarWorkerKind,
  status: "completed" | "failed" | "cancelled",
  progress: WorkerRunProgress = {},
): Promise<void> {
  if (!runId) return;
  try {
    await pool.query(
      `update radar_agent_runs
       set status = $2, completed_at = now(), heartbeat_at = now(),
           input_count = coalesce($3, input_count),
           output_count = coalesce($4, output_count),
           error = coalesce($5, error),
           metadata = metadata || $6::jsonb
       where id = $1 and status in ('running', 'paused', 'queued')`,
      [
        runId,
        status,
        progress.inputCount ?? null,
        progress.outputCount ?? null,
        progress.lastError?.slice(0, 500) ?? null,
        JSON.stringify(metadata(workerKind, progress)),
      ],
    );
  } catch {
    // Best-effort shutdown telemetry.
  }
}

export interface WorkerTickOutcome {
  status: "completed" | "failed";
  startedAt: Date;
  inputCount?: number;
  outputCount?: number;
  error?: string;
}

export interface WorkerTickHealth {
  status: string;
  heartbeatAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
}

/** Stable run id for a short-tick lane that keeps one liveness row. */
export const workerTickRunId = (workerKind: RadarWorkerKind) =>
  `worker:${workerKind}`;

/**
 * Records one pass of a short, frequently repeating lane (the creator tick
 * runs every minute) by upserting a single liveness row instead of appending
 * a run per tick. The row reads "running" while passes succeed, so the admin
 * worker-lane table shows it as live until its heartbeat goes stale, and
 * "failed" with the error after a failed pass. `metadata.lastSuccessAt`
 * survives failures so readiness can measure how long the lane has been
 * unhealthy. Best-effort: telemetry never fails the tick.
 */
export async function recordWorkerTick(
  pool: Pool,
  workerKind: RadarWorkerKind,
  outcome: WorkerTickOutcome,
): Promise<void> {
  const now = new Date().toISOString();
  const durationMs = Math.max(0, Date.now() - outcome.startedAt.getTime());
  const details = {
    ...metadata(workerKind, { lastError: outcome.error }),
    runType: "worker-tick",
    lastRunAt: now,
    durationMs,
    ...(outcome.status === "completed"
      ? { lastSuccessAt: now }
      : { lastFailureAt: now }),
  };
  try {
    await pool.query(
      `insert into radar_agent_runs
         (id, agent_kind, status, correlation_id, started_at, heartbeat_at,
          completed_at, input_count, output_count, error, metadata)
       values ($1, $2, $3, $1, $4, now(), now(), $5, $6, $7, $8::jsonb)
       on conflict (id) do update
         set status = excluded.status,
             started_at = excluded.started_at,
             heartbeat_at = now(),
             completed_at = now(),
             input_count = excluded.input_count,
             output_count = excluded.output_count,
             error = excluded.error,
             metadata = (radar_agent_runs.metadata - 'lastError') || excluded.metadata`,
      [
        workerTickRunId(workerKind),
        workerKind,
        outcome.status === "completed" ? "running" : "failed",
        outcome.startedAt.toISOString(),
        outcome.inputCount ?? 0,
        outcome.outputCount ?? 0,
        outcome.error?.slice(0, 500) ?? null,
        JSON.stringify(details),
      ],
    );
  } catch {
    // Observability must not take down a productive worker tick.
  }
}

/** Reads the liveness row written by recordWorkerTick. */
export async function readWorkerTickHealth(
  pool: Pool,
  workerKind: RadarWorkerKind,
): Promise<WorkerTickHealth | undefined> {
  const result = await pool.query<{
    status: string;
    heartbeat_at: Date | string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
  }>(
    `select status, heartbeat_at, metadata->>'lastSuccessAt' as last_success_at,
            metadata->>'lastFailureAt' as last_failure_at
       from radar_agent_runs where id = $1`,
    [workerTickRunId(workerKind)],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    status: row.status,
    ...(row.heartbeat_at
      ? { heartbeatAt: new Date(row.heartbeat_at).toISOString() }
      : {}),
    ...(row.last_success_at ? { lastSuccessAt: row.last_success_at } : {}),
    ...(row.last_failure_at ? { lastFailureAt: row.last_failure_at } : {}),
  };
}
