#!/usr/bin/env node
/**
 * Production wiring for missa-radar: same RadarServer as the core package's
 * demo CLI, but backed by Postgres persistence instead of a JSON file, and
 * (optionally) the Playwright fetcher / LLM extractor instead of the
 * deterministic built-ins. This lives here, not in @missa/radar-engine,
 * because it needs pg/playwright/@anthropic-ai/sdk — the core engine stays
 * dependency-free.
 *
 *   DATABASE_URL=postgres://... node dist/src/serve.js
 *
 * Env vars:
 *   DATABASE_URL        required — Postgres connection string
 *   PORT                default 4173
 *   TICK_MINUTES        default 15 (0 disables the automatic tick)
 *   MISSA_SESSION_SECRET  optional — omit only for throwaway/dev use
 *   MISSA_USE_PLAYWRIGHT  set to "1" to fetch with a real browser instead of
 *                         plain HTTP (requires Chromium installed — see README)
 *   ANTHROPIC_API_KEY   optional — when set, extraction uses Claude instead
 *                       of the deterministic extractor
 */
import { Pool } from 'pg';
import { RadarEngine, RadarServer, HttpFetcher, systemClock } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from './postgresStore.js';
import { PlaywrightFetcher } from './playwrightFetcher.js';
import { LlmExtractor } from './llmExtractor.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required. Example: DATABASE_URL=postgres://user:pass@host:5432/db node dist/src/serve.js');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  await ensurePostgresSchema(pool);
  const store = await loadStoreFromPostgres(pool);

  const fetcher = process.env.MISSA_USE_PLAYWRIGHT === '1' ? new PlaywrightFetcher() : new HttpFetcher();
  const extractor = process.env.ANTHROPIC_API_KEY ? new LlmExtractor(systemClock) : undefined;

  const engine = new RadarEngine({ store, fetcher, extractor });
  const port = Number(process.env.PORT ?? 4173);
  const tickMinutes = Number(process.env.TICK_MINUTES ?? 15);

  const server = new RadarServer({
    engine,
    port,
    sessionSecret: process.env.MISSA_SESSION_SECRET,
    tickIntervalMs: tickMinutes > 0 ? tickMinutes * 60_000 : undefined,
    onPersist: (s) => saveStoreToPostgres(s, pool),
  });

  const boundPort = await server.start();
  console.log(`Missa Radar (production wiring) serving at http://localhost:${boundPort}`);
  console.log(`  fetcher: ${fetcher.constructor.name}, extractor: ${extractor ? 'LlmExtractor' : 'DeterministicExtractor'}, store: Postgres`);

  const shutdown = async () => {
    await server.stop();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
