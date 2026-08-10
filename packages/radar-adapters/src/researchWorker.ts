#!/usr/bin/env node

/**
 * Missa's continuous opportunity research lane.
 *
 * This deliberately reuses Radar's robots-aware fetcher, deterministic
 * validation, deduplication, freshness, and Postgres persistence. It is not
 * an unconstrained scraper or a second source of truth. Tier-0 pages remain
 * canonical; directory/feed tiers are research inputs whose extracted calls
 * stay reviewable until evidence is sufficient for publication.
 */
import { runDiscoveryWorker } from './discoveryWorker.js';
import { runSourcePromotionWorker } from './sourcePromotionWorker.js';

function intervalMs(): number {
  const minutes = Number(process.env.RADAR_RESEARCH_INTERVAL_MINUTES ?? 5);
  return Number.isFinite(minutes) && minutes > 0 ? Math.max(60_000, Math.round(minutes * 60_000)) : 5 * 60_000;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run the Missa research agent.');
    process.exitCode = 1;
    return;
  }

  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const interval = intervalMs();
  console.log('[missa-research-agent] running bounded directory fan-out every ' + Math.round(interval / 60_000) + ' minutes');
  await Promise.all([
    runDiscoveryWorker({
      maxSources: Number(process.env.RADAR_RESEARCH_BATCH_SIZE ?? process.env.RADAR_DISCOVERY_BATCH_SIZE ?? 100),
      intervalMs: interval,
      signal: controller.signal,
      workerKind: "research-worker",
      logger: console,
    }),
    runSourcePromotionWorker({
      maxCandidates: Number(process.env.MISSA_SOURCE_PROMOTION_BATCH_SIZE ?? 50),
      concurrency: Number(process.env.MISSA_SOURCE_PROMOTION_CONCURRENCY ?? 12),
      intervalMs: Math.max(60_000, Number(process.env.MISSA_SOURCE_PROMOTION_INTERVAL_MINUTES ?? 5) * 60_000),
      promotionMode: process.env.MISSA_SOURCE_PROMOTION_MODE === "promote" ? "promote" : "review",
      signal: controller.signal,
      workerKind: "source-promotion-worker",
      logger: console,
    }),
  ]);
}

main().catch((error) => {
  console.error('[missa-research-agent] stopped unexpectedly', error);
  process.exitCode = 1;
});
