import type { MyStatus } from '../domain/types.js';
import type { RadarStore } from '../store/store.js';
import { daysBetween, isoDateOf } from '../extraction/dates.js';

/**
 * Fallback response window when an organization has no (or too little)
 * tracked history yet — chosen from typical lit-mag/grant response times
 * reported industry-wide (Chill Subs' community median sits well under
 * this). Deliberately generous so we under-warn rather than nag on thin data.
 */
export const DEFAULT_RESPONSE_WINDOW_DAYS = 90;

/** Need at least this many historical data points before trusting a per-org number. */
const MIN_SAMPLE_SIZE = 3;

export interface ResponseStats {
  organizationId: string;
  sampleSize: number;
  medianDays: number;
  p90Days: number;
}

/** Any status that means "we heard something back" after submitting. */
const RESPONSE_STATUSES: readonly MyStatus[] = [
  'received', 'in-review', 'longlisted', 'shortlisted', 'finalist',
  'accepted', 'declined', 'waitlisted', 'revision-requested',
];

function percentile(sortedDays: number[], p: number): number {
  const idx = Math.min(sortedDays.length - 1, Math.floor((p / 100) * sortedDays.length));
  return sortedDays[idx];
}

/**
 * Response-time distribution for one organization, derived from this
 * deployment's own tracked-submission history (the community-blended
 * "trackerSnapshot" idea, just scoped to what Missa itself has observed).
 * Returns undefined when there isn't enough history yet to trust a number.
 */
export function computeResponseStats(store: RadarStore, organizationId: string): ResponseStats | undefined {
  const samples: number[] = [];
  for (const t of store.tracked) {
    if (!t.submittedAt) continue;
    const opp = store.opportunities.get(t.opportunityId);
    if (!opp || opp.fields.organizationId !== organizationId) continue;
    const responseEvent = t.events.find((e) => e.at > t.submittedAt! && RESPONSE_STATUSES.includes(e.to));
    if (!responseEvent) continue;
    samples.push(daysBetween(isoDateOf(new Date(t.submittedAt)), isoDateOf(new Date(responseEvent.at))));
  }
  if (samples.length < MIN_SAMPLE_SIZE) return undefined;
  samples.sort((a, b) => a - b);
  return {
    organizationId,
    sampleSize: samples.length,
    medianDays: percentile(samples, 50),
    p90Days: percentile(samples, 90),
  };
}

/** The window past which silence counts as "overdue" — organization-specific once we have data, a generous default otherwise. */
export function expectedResponseWindowDays(store: RadarStore, organizationId: string | undefined): number {
  if (!organizationId) return DEFAULT_RESPONSE_WINDOW_DAYS;
  return computeResponseStats(store, organizationId)?.p90Days ?? DEFAULT_RESPONSE_WINDOW_DAYS;
}
