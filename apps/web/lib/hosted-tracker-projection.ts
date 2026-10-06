import {
  CreatorIdempotencyConflictError,
  TrackingLimitReachedError,
  creatorRelationalAuthorityEnabled,
  saveCanonicalOpportunityToTracker,
  updateCanonicalTrackerStatus,
  type CanonicalTrackerStatus,
} from '@missa/radar-adapters';

/** What a Missa-hosted event can set a creator's application to. */
export type HostedTrackerStatus = Extract<CanonicalTrackerStatus, 'submitted' | 'withdrawn' | 'accepted' | 'declined' | 'waitlisted'>;

export type HostedTrackerProjection =
  | 'updated'
  | 'unchanged'
  | 'saved-and-updated'
  /** The call is not a published opportunity the Tracker can hold. */
  | 'not-available'
  /** Saving the call would exceed the Free plan's active-call allowance. */
  | 'limit-reached'
  /** Another change already used this key with a different status. */
  | 'conflict'
  /** Relational authority is off or there is no database; the legacy store is authoritative. */
  | 'skipped'
  | 'failed';

/**
 * Projects a Missa-hosted event (a submission sent, withdrawn or decided) onto
 * the creator's canonical Tracker. The legacy Radar store receives the same
 * change through `radar.setMyStatus`; under relational authority the Tracker,
 * Home and Calendar read these tables instead, so the change has to land here
 * too. A call the creator never saved is saved first, as the legacy path does.
 *
 * Never throws. The hosted command has already succeeded by the time this
 * runs, so a projection problem is logged and reported, not turned into a
 * failed request.
 */
export async function projectHostedStatusToTracker(input: {
  accountId: string;
  opportunityId: string;
  status: HostedTrackerStatus;
  source: 'user' | 'radar';
  note: string;
  /** Stable per hosted event, so a replayed command records one status event. */
  idempotencyKey: string;
}): Promise<HostedTrackerProjection> {
  const url = process.env.DATABASE_URL;
  if (!url || !creatorRelationalAuthorityEnabled(process.env)) return 'skipped';
  const options = { source: input.source, note: input.note, idempotencyKey: input.idempotencyKey };
  try {
    const first = await updateCanonicalTrackerStatus(url, input.accountId, input.opportunityId, input.status, options);
    if (first) return first.status === 'unchanged' ? 'unchanged' : 'updated';
    // Not tracked yet: a hosted submission or decision belongs in the Tracker
    // even when the creator never pressed Save.
    const saved = await saveCanonicalOpportunityToTracker(url, input.accountId, input.opportunityId, { idempotencyKey: `${input.idempotencyKey}:save` });
    if (!saved) return 'not-available';
    const second = await updateCanonicalTrackerStatus(url, input.accountId, input.opportunityId, input.status, options);
    return second ? 'saved-and-updated' : 'not-available';
  } catch (error) {
    if (error instanceof CreatorIdempotencyConflictError) return 'conflict';
    if (error instanceof TrackingLimitReachedError) return 'limit-reached';
    console.error('[hosted-tracker] Tracker projection failed', { opportunityId: input.opportunityId, status: input.status }, error instanceof Error ? error.message : error);
    return 'failed';
  }
}
