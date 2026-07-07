import type { OpportunityCandidate, PageSnapshot, Source } from './domain/types.js';

/** Injectable time so ticks, decay, and prediction are deterministic in tests. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export interface FetchResult {
  status: 'ok' | 'error' | 'gone';
  content: string;
}

/**
 * Fetcher port. The built-in adapters are a fixture fetcher (tests/demo) and a
 * minimal HTTP fetcher; production swaps in Crawlee + Playwright behind the
 * same interface. Implementations must respect robots.txt / source terms.
 */
export interface Fetcher {
  fetch(source: Source): Promise<FetchResult>;
}

/**
 * Extractor port. The built-in extractor is fully deterministic and
 * synchronous. An LLM-assisted extractor may replace it — hence the
 * `Promise` allowance — but its output always passes through the same
 * deterministic validators ("do not make Radar purely AI").
 */
export interface Extractor {
  extract(source: Source, snapshot: PageSnapshot): OpportunityCandidate | Promise<OpportunityCandidate>;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export function sequentialIds(): IdGenerator {
  const counters = new Map<string, number>();
  return {
    next(prefix: string): string {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      return `${prefix}_${String(n).padStart(4, '0')}`;
    },
  };
}
