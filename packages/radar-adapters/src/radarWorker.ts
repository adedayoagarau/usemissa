import type { PoolClient } from "pg";
import type { TickReport } from "@missa/radar-engine";
import type { RadarEngine } from "@missa/radar-engine";
import { createProductionEngine } from "./productionEngine.js";

/**
 * Postgres advisory-lock key for the single Radar ingestion lane. Advisory
 * locks are held by a database session, so a second worker (or a manually
 * started copy) can safely skip a tick without mutating a concurrently loaded
 * in-memory snapshot.
 */
export const RADAR_INGESTION_LOCK = { namespace: 1984, key: 727 } as const;
export const DISCOVERY_INGESTION_LOCK = { namespace: 1984, key: 728 } as const;
export const DEFAULT_RADAR_WORKER_BATCH_SIZE = 10;
export const MAX_RADAR_WORKER_BATCH_SIZE = 50;

export interface RadarWorkerOptions {
  /** Number of due sources processed per tick. Defaults to 10. */
  maxSources?: number;
  minRegistryTier?: 0 | 1 | 2 | 3;
  maxRegistryTier?: 0 | 1 | 2 | 3;
  /** Delay between completed ticks. Defaults to TICK_MINUTES or 15 minutes. */
  intervalMs?: number;
  /** Optional logger, useful for hosted worker runtimes and tests. */
  logger?: Pick<Console, "info" | "error" | "warn">;
  /** Optional post-tick work executed before the durable snapshot is persisted. */
  afterTick?: (engine: RadarEngine) => Promise<void>;
}

export interface RadarWorkerTickResult {
  status: "completed" | "skipped";
  report?: TickReport;
}

function positiveInteger(value: number | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return value !== undefined && Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}

/** Bounded batch size shared by the hosted cron and long-running worker. */
export function radarWorkerBatchSize(value: string | number | undefined = process.env.RADAR_WORKER_BATCH_SIZE): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return positiveInteger(parsed, DEFAULT_RADAR_WORKER_BATCH_SIZE, MAX_RADAR_WORKER_BATCH_SIZE);
}

export async function tryAdvisoryLock(client: PoolClient, lock: { namespace: number; key: number } = RADAR_INGESTION_LOCK): Promise<boolean> {
  // Neon commonly sits behind a pooler. Session-scoped advisory locks can
  // survive `client.release()` on an idle pooled backend, starving every
  // other lane. Keep the lock inside an explicit transaction instead.
  await client.query("begin");
  const result = await client.query(
    "select pg_try_advisory_xact_lock($1, $2) as locked",
    [lock.namespace, lock.key],
  );
  const locked = result.rows[0]?.locked === true;
  if (!locked) await client.query("rollback");
  return locked;
}

export async function releaseAdvisoryLock(client: PoolClient): Promise<void> {
  await client.query("commit");
}

/** Run one bounded, serialized production tick. */
export async function runRadarWorkerTick(
  options: Pick<RadarWorkerOptions, "maxSources" | "minRegistryTier" | "maxRegistryTier" | "logger" | "afterTick"> = {},
): Promise<RadarWorkerTickResult> {
  const logger = options.logger ?? console;
  const maxSources = positiveInteger(options.maxSources, DEFAULT_RADAR_WORKER_BATCH_SIZE, MAX_RADAR_WORKER_BATCH_SIZE);
  const production = await createProductionEngine();
  let lockClient: PoolClient | undefined;
  let locked = false;

  try {
    lockClient = await production.pool.connect();
    locked = await tryAdvisoryLock(lockClient);
    if (!locked) {
      logger.info("[missa-radar-worker] another ingestion tick is running; skipping");
      return { status: "skipped" };
    }

    const report = await production.engine.tick({ maxSources, minRegistryTier: options.minRegistryTier, maxRegistryTier: options.maxRegistryTier });
    await options.afterTick?.(production.engine);
    await production.persist();
    logger.info(
      `[missa-radar-worker] tick complete: ${report.sourcesChecked} sources checked, ${report.sourcesFailed} failed`,
    );
    return { status: "completed", report };
  } finally {
    if (locked && lockClient) {
      try {
        await releaseAdvisoryLock(lockClient);
      } catch (error) {
        logger.warn("[missa-radar-worker] failed to release advisory lock", error);
      }
    }
    lockClient?.release();
    await production.close();
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * Long-running worker loop for Railway/Render/Fly/container deployments.
 * Each tick gets a fresh engine snapshot and persists before the next sleep;
 * the advisory lock makes restarts and accidental duplicate workers safe.
 */
export async function runRadarWorker(
  options: RadarWorkerOptions & { signal?: AbortSignal } = {},
): Promise<void> {
  const logger = options.logger ?? console;
  const maxSources = radarWorkerBatchSize(options.maxSources);
  const intervalMs = positiveInteger(
    options.intervalMs,
    positiveInteger(Number(process.env.TICK_MINUTES) * 60_000, 15 * 60_000),
  );
  const configuredMaxTier = Number(process.env.RADAR_MAX_TIER);
  const maxRegistryTier = configuredMaxTier >= 0 && configuredMaxTier <= 3 ? configuredMaxTier as 0 | 1 | 2 | 3 : undefined;

  while (!options.signal?.aborted) {
    try {
      await runRadarWorkerTick({ maxSources, maxRegistryTier, logger });
    } catch (error) {
      logger.error("[missa-radar-worker] tick failed; retrying after interval", error);
    }
    await sleep(intervalMs, options.signal);
  }
}
