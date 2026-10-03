import {
  assertRoomForActiveCall,
  CREATOR_PLAN_LIMITS,
  creatorPlan,
  creatorPoolFor,
  isActiveTrackedStatus,
  type CreatorPlan,
} from '@missa/radar-adapters';

/** The parts of the legacy Radar store the Free limit reads. */
export type LegacyTrackerStore = {
  tracked: ReadonlyArray<{ userId: string; opportunityId: string; myStatus: string }>;
  opportunities: ReadonlyMap<string, { fields: { deadline?: { date?: string } } }>;
};

/**
 * Calls in progress in the legacy Radar store, counted the way the relational
 * Tracker counts them: an in-progress status, and no deadline or one today or
 * later. Submitted, decided and lapsed calls never count.
 */
export function legacyActiveTracked(store: LegacyTrackerStore, userId: string, today = new Date().toISOString().slice(0, 10)): number {
  return store.tracked.filter((item) => {
    if (item.userId !== userId || !isActiveTrackedStatus(item.myStatus)) return false;
    const deadline = store.opportunities.get(item.opportunityId)?.fields.deadline?.date;
    return !deadline || deadline >= today;
  }).length;
}

/** The account's plan from creator_plans when a database is configured; Free otherwise. */
export async function legacyCreatorPlan(accountId: string): Promise<CreatorPlan> {
  if (!process.env.DATABASE_URL) return 'free';
  return creatorPlan(creatorPoolFor(process.env.DATABASE_URL), accountId);
}

/**
 * The Free limit for writes that still go to the legacy Radar store. Throws
 * TrackingLimitReachedError when the write would add a call in progress past
 * the plan's limit: a new save (`nextStatus` omitted), or a status move that
 * brings a submitted or closed call back into progress. Re-saving a tracked
 * call and moves between in-progress statuses are always allowed.
 */
export async function assertLegacyTrackingAllowance(
  store: LegacyTrackerStore,
  input: { accountId: string; userId: string; opportunityId: string; nextStatus?: string },
  plan: (accountId: string) => Promise<CreatorPlan> = legacyCreatorPlan,
): Promise<void> {
  const existing = store.tracked.find((item) => item.userId === input.userId && item.opportunityId === input.opportunityId);
  if (input.nextStatus === undefined) {
    if (existing) return;
  } else if (!existing || !isActiveTrackedStatus(input.nextStatus) || isActiveTrackedStatus(existing.myStatus)) {
    return;
  }
  const limit = CREATOR_PLAN_LIMITS[await plan(input.accountId)].activeTrackedLimit;
  if (limit === null) return;
  if (input.nextStatus !== undefined) {
    // A call already past its deadline never counts, so moving it never takes a place.
    const deadline = store.opportunities.get(input.opportunityId)?.fields.deadline?.date;
    if (deadline && deadline < new Date().toISOString().slice(0, 10)) return;
  }
  assertRoomForActiveCall({ activeTrackedLimit: limit, activeTracked: legacyActiveTracked(store, input.userId) });
}
