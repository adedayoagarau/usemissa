import type { Source } from '../domain/types.js';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Polite scheduling: a source is due when its per-source cadence has elapsed.
 * Repeated failures back the cadence off exponentially (capped) so a broken
 * source never gets hammered.
 */
export function isDue(source: Source, now: Date): boolean {
  if (!source.active) return false;
  if (!source.lastCheckedAt) return true;
  const backoff = Math.min(2 ** source.consecutiveFailures, 8);
  const intervalMs = source.checkIntervalHours * MS_PER_HOUR * backoff;
  return now.getTime() - Date.parse(source.lastCheckedAt) >= intervalMs;
}

export function dueSources(sources: Iterable<Source>, now: Date): Source[] {
  return [...sources].filter((s) => isDue(s, now));
}
