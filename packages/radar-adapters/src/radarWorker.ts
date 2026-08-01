import type { PoolClient } from "pg";
import type { TickReport } from "@missa/radar-engine";
import { createProductionEngine } from "./productionEngine.js";

/**
 * Postgres advisory-lock key for the single Radar ingestion lane. Advisory
 * locks are held by a database session, so a second worker (or a manually
 * started copy) can safely skip a tick without mutating a concurrently loaded
 * in-memory snapshot.
 */
export const RADAR_INGESTION_LOCK = { namespace: 1984, key: 727 } as const;

export interface RadarWorkerOptions {
  /** Number of due sources processed per tick. Defaults to 10. */
  maxSources?: number;
  /** Delay between completed ticks. Defaults to TICK_MINUTES or 15 minutes. */
  intervalMs?: number;
  /** Optional logger, useful for hosted worker runtimes and tests. */
  logger?: Pick<Console, "info" | "error" | "warn">;
}

export interface RadarWorkerTickResult {
  status: "completed" | "skipped";
  report?: TickReport;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
}

async function tryAdvisoryLock(client: PoolClient): Promise<boolean> {
  const result = await client.query(
    "select pg_try_advisory_lock($1, $2) as locked",
    [RADAR_INGESTION_LOCK.namespace, RADAR_INGESTION_LOCK.key],
  );
  return result.rows[0]?.locked === true;
}

async function releaseAdvisoryLock(client: PoolClient): Promise<void> {
  await client.query(
    "select pg_advisory_unlock($1, $2)",
    [RADAR_INGESTION_LOCK.namespace, RADAR_INGESTION_LOCK.key],
  );
}

/** Run one bounded, serialized production tick. */
export async function runRadarWorkerTick(
  options: Pick<RadarWorkerOptions, "maxSources" | "logger"> = {},
): Promise<RadarWorkerTickResult> {
  const logger = options.logger ?? console;
  const maxSources = positiveInteger(options.maxSources, 10);
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

    const report = await production.engine.tick({ maxSources });
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
  const maxSources = positiveInteger(options.maxSources, 10);
  const intervalMs = positiveInteger(
    options.intervalMs,
    positiveInteger(Number(process.env.TICK_MINUTES) * 60_000, 15 * 60_000),
  );

  while (!options.signal?.aborted) {
    try {
      await runRadarWorkerTick({ maxSources, logger });
    } catch (error) {
      logger.error("[missa-radar-worker] tick failed; retrying after interval", error);
    }
    await sleep(intervalMs, options.signal);
  }
}
