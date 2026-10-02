import type { TrackingLimitReachedError } from '@missa/radar-adapters';

/**
 * Response body for a save refused by the Free tracking limit. Calm and
 * factual: it says what counts, what frees a place, and what Plus adds.
 */
export function trackingLimitBody(error: TrackingLimitReachedError) {
  return {
    code: error.code,
    limit: error.limit,
    active: error.active,
    error: `You're working on ${error.active} calls, the most Free tracks at once. Mark one as submitted or remove one you've decided against, and this call will save. Plus, coming soon, has no limit.`,
    actionHref: '/tracker',
    actionLabel: 'Open Tracker',
  };
}
