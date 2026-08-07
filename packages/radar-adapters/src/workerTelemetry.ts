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
  | "enrichment-worker"
  | "review-worker";

export interface WorkerRunProgress {
  inputCount?: number;
  outputCount?: number;
  lastError?: string;
}

export type WorkerRunLifecycleStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled" | "missing";

function instanceId(): string | undefined {
  return process.env.RAILWAY_REPLICA_ID ?? process.env.RAILWAY_SERVICE_ID ?? process.env.HOSTNAME;
}

function metadata(workerKind: RadarWorkerKind, progress: WorkerRunProgress = {}): Record<string, unknown> {
  return {
    runType: "worker",
    workerKind,
    ...(instanceId() ? { instanceId: instanceId() } : {}),
    heartbeatAt: new Date().toISOString(),
    ...(progress.lastError ? { lastError: progress.lastError.slice(0, 500) } : {}),
  };
}

/**
 * Starts an append-only worker process record. Telemetry is deliberately
 * best-effort: a missing target schema must not stop the ingestion lane from
 * doing its primary work.
 */
export async function startWorkerRun(pool: Pool, workerKind: RadarWorkerKind): Promise<string | undefined> {
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
          [queued.rows[0].id, JSON.stringify({ ...metadata(workerKind), claimedAt: new Date().toISOString() })],
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

export async function readWorkerRunLifecycle(pool: Pool, runId: string | undefined): Promise<WorkerRunLifecycleStatus> {
  if (!runId) return "missing";
  try {
    const result = await pool.query<{ status: WorkerRunLifecycleStatus }>(
      "select status from radar_agent_runs where id = $1",
      [runId],
    );
    return result.rows[0]?.status ?? "missing";
  } catch {
    return "missing";
  }
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
      [runId, progress.inputCount ?? null, progress.outputCount ?? null, progress.lastError?.slice(0, 500) ?? null, JSON.stringify(metadata(workerKind, progress))],
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
      [runId, status, progress.inputCount ?? null, progress.outputCount ?? null, progress.lastError?.slice(0, 500) ?? null, JSON.stringify(metadata(workerKind, progress))],
    );
  } catch {
    // Best-effort shutdown telemetry.
  }
}
