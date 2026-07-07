/**
 * Shared production-engine construction, extracted from serve.ts so both the
 * long-running dev/self-hosted server (serve.ts) and short-lived serverless
 * callers (apps/web's Vercel Cron route, Story 1.5) build the exact same
 * engine the exact same way -- one source of truth for "what does a
 * production RadarEngine look like", not two.
 */
import { Pool } from 'pg';
import { RadarEngine, HttpFetcher, systemClock } from '@missa/radar-engine';
import { ensurePostgresSchema, loadStoreFromPostgres, saveStoreToPostgres } from './postgresStore.js';
import { PlaywrightFetcher } from './playwrightFetcher.js';
import { LlmExtractor } from './llmExtractor.js';

export interface ProductionEngine {
  engine: RadarEngine;
  pool: Pool;
  /** Persists the current in-memory store back to Postgres. Call this after
   * every tick in a short-lived (serverless) caller -- there's no long-running
   * process to rely on periodic autosave the way serve.ts's RadarServer has. */
  persist(): Promise<void>;
  /** Callers must call this when done (serverless: at the end of the request;
   * long-running: on shutdown) -- leaving pool connections open leaks them. */
  close(): Promise<void>;
}

export async function createProductionEngine(): Promise<ProductionEngine> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to build a production RadarEngine.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  await ensurePostgresSchema(pool);
  const store = await loadStoreFromPostgres(pool);

  const fetcher = process.env.MISSA_USE_PLAYWRIGHT === '1' ? new PlaywrightFetcher() : new HttpFetcher();
  const extractor = process.env.ANTHROPIC_API_KEY ? new LlmExtractor(systemClock) : undefined;

  const engine = new RadarEngine({ store, fetcher, extractor });

  return {
    engine,
    pool,
    persist: () => saveStoreToPostgres(engine.store, pool),
    close: () => pool.end(),
  };
}
