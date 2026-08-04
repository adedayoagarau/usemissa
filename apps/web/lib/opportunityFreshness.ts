export type OpportunityFreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown';

export interface OpportunityFreshness {
  state: OpportunityFreshnessState;
  label: string;
  detail: string;
}

/**
 * Public freshness language is deliberately human, not a raw Radar score.
 * A detail is fresh for two days, aging until the first-week boundary, and
 * stale after that. Unknown is reserved for records that have never completed
 * a successful processing pass.
 */
export function opportunityFreshness(checkedAt: string | undefined, now = Date.now()): OpportunityFreshness {
  if (!checkedAt) return { state: 'unknown', label: 'Needs verification', detail: 'Missa has not confirmed the details yet.' };
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return { state: 'unknown', label: 'Needs verification', detail: 'Missa has not confirmed the details yet.' };

  const ageMs = Math.max(0, now - timestamp);
  const ageHours = ageMs / 3_600_000;
  const state: OpportunityFreshnessState = ageHours <= 48 ? 'fresh' : ageHours <= 24 * 7 ? 'aging' : 'stale';
  const detail = relativeTime(ageMs);
  return {
    state,
    label: state === 'fresh' ? 'Recently checked' : state === 'aging' ? 'Check is aging' : 'Needs a fresh check',
    detail: `Checked ${detail}`,
  };
}

function relativeTime(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

