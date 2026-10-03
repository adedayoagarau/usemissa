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

/** Response body for a Tracker import refused because it would pass the Free limit. */
export function importTrackingLimitBody(error: TrackingLimitReachedError) {
  return {
    code: error.code,
    limit: error.limit,
    active: error.active,
    error: `This import would leave ${error.active} calls in progress, and Free tracks ${error.limit} at once. Nothing was imported. Mark rows you've already sent as submitted, or skip some, then import again. Submitted and closed calls never count.`,
    actionHref: '/tracker',
    actionLabel: 'Open Tracker',
  };
}
