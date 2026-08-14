import { createHash } from "node:crypto";
import type { Pool } from "pg";

/**
 * Model extraction is deterministic at temperature 0, so the same page text put
 * to the same model with the same prompt yields the same answer. Most sources
 * are re-checked on a weekly cadence and most pages do not change between
 * checks, which makes the repeat call pure waste.
 *
 * The cache is keyed by content hash, so a changed page misses automatically and
 * no staleness window has to be guessed at. Prompt and model are part of the key
 * because either changing makes a stored answer no longer the answer we would
 * get today.
 */
export interface ModelCacheEntry {
  contentHash: string;
  model: string;
  promptVersion: string;
}

export interface ModelResponseCache {
  readonly id: string;
  get(key: string): Promise<unknown | undefined>;
  set(key: string, response: unknown, entry: ModelCacheEntry): Promise<void>;
}

export function modelCacheKey(parts: { contentHash: string; model: string; promptVersion: string }): string {
  return createHash("sha256").update(`${parts.promptVersion}:${parts.model}:${parts.contentHash}`).digest("hex").slice(0, 40);
}

export class MemoryModelResponseCache implements ModelResponseCache {
  readonly id = "memory";
  private readonly entries = new Map<string, unknown>();
  async get(key: string): Promise<unknown | undefined> { return this.entries.get(key); }
  async set(key: string, response: unknown): Promise<void> { this.entries.set(key, response); }
  size(): number { return this.entries.size; }
}

export const modelCacheSchema = `
create table if not exists missa_ingestion_v2_model_cache (
  cache_key text primary key,
  content_hash text not null,
  model text not null,
  prompt_version text not null,
  response jsonb not null,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists missa_ingestion_v2_model_cache_used_idx on missa_ingestion_v2_model_cache(last_used_at);
`;

/**
 * Cache failures are swallowed. A cache is an optimisation, and losing one must
 * never fail a run that would otherwise have succeeded — the worst case is that
 * we pay for a call we already had an answer for.
 */
export class PostgresModelResponseCache implements ModelResponseCache {
  readonly id = "postgres";
  private hits = 0;
  private misses = 0;

  constructor(private readonly pool: Pool, private readonly logger: Pick<Console, "warn"> = console) {}

  async get(key: string): Promise<unknown | undefined> {
    try {
      const result = await this.pool.query<{ response: unknown }>(
        `update missa_ingestion_v2_model_cache set hits = hits + 1, last_used_at = now() where cache_key = $1 returning response`,
        [key],
      );
      const row = result.rows[0];
      if (row) { this.hits += 1; return row.response; }
      this.misses += 1;
      return undefined;
    } catch (error) {
      this.logger.warn(`[missa-ingestion-v2] model cache read failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  async set(key: string, response: unknown, entry: ModelCacheEntry): Promise<void> {
    try {
      await this.pool.query(
        `insert into missa_ingestion_v2_model_cache (cache_key, content_hash, model, prompt_version, response)
         values ($1, $2, $3, $4, $5::jsonb)
         on conflict (cache_key) do update set response = excluded.response, last_used_at = now()`,
        [key, entry.contentHash, entry.model, entry.promptVersion, JSON.stringify(response ?? null)],
      );
    } catch (error) {
      this.logger.warn(`[missa-ingestion-v2] model cache write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  stats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total ? Number((this.hits / total).toFixed(3)) : 0 };
  }
}
