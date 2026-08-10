import type { Source } from '../domain/types.js';

const MS_PER_HOUR = 60 * 60 * 1000;

function intervalMs(source: Source): number {
  const hours = Number.isFinite(source.checkIntervalHours) && source.checkIntervalHours > 0
    ? source.checkIntervalHours
    : 24;
  const failures = Math.max(
    source.consecutiveFailures,
    source.consecutiveProcessingFailures ?? 0,
  );
  return hours * MS_PER_HOUR * Math.min(2 ** failures, 8);
}

/** Calculate and persist callers' next scheduler target without mutating source state. */
export function nextCheckAt(source: Source, from: Date): Date {
  return new Date(from.getTime() + intervalMs(source));
}

/**
 * Polite scheduling: a source is due when its per-source cadence has elapsed.
 * Repeated failures back the cadence off exponentially (capped) so a broken
 * source never gets hammered.
 */
export function isDue(source: Source, now: Date): boolean {
  if (!source.active) return false;
  if (!source.lastCheckedAt) return true;
  if (source.nextCheckAt) {
    const next = Date.parse(source.nextCheckAt);
    if (Number.isFinite(next)) return now.getTime() >= next;
  }
  const lastChecked = Date.parse(source.lastCheckedAt);
  if (!Number.isFinite(lastChecked)) return true;
  return now.getTime() >= nextCheckAt(source, new Date(lastChecked)).getTime();
}

export function dueSources(sources: Iterable<Source>, now: Date): Source[] {
  return [...sources].filter((s) => isDue(s, now));
}
