import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_ACTIVE_TRACKED_LIMIT, TrackingLimitReachedError, type CreatorPlan } from '@missa/radar-adapters';
import { assertLegacyTrackingAllowance, legacyActiveTracked, type LegacyTrackerStore } from './legacyTrackingAllowance';

const future = '2999-01-01';
const past = '2000-01-01';

function store(statuses: string[], extra: Array<{ id: string; status: string; deadline?: string }> = []) {
  const opportunities = new Map<string, { fields: { deadline?: { date?: string } } }>();
  const tracked: Array<{ userId: string; opportunityId: string; myStatus: string }> = [];
  statuses.forEach((status, index) => {
    opportunities.set(`opp_${index}`, { fields: { deadline: { date: future } } });
    tracked.push({ userId: 'user_1', opportunityId: `opp_${index}`, myStatus: status });
  });
  for (const item of extra) {
    opportunities.set(item.id, { fields: { deadline: item.deadline ? { date: item.deadline } : {} } });
    if (item.status !== 'untracked') tracked.push({ userId: 'user_1', opportunityId: item.id, myStatus: item.status });
  }
  opportunities.set('opp_new', { fields: { deadline: { date: future } } });
  // Another creator's calls never count.
  tracked.push({ userId: 'user_2', opportunityId: 'opp_new', myStatus: 'preparing' });
  return { tracked, opportunities } satisfies LegacyTrackerStore;
}

const free = async (): Promise<CreatorPlan> => 'free';
const plus = async (): Promise<CreatorPlan> => 'plus';
const atLimit = () => Array.from({ length: FREE_ACTIVE_TRACKED_LIMIT }, (_, index) => (index % 2 ? 'preparing' : 'saved'));
const input = { accountId: 'acc_1', userId: 'user_1', opportunityId: 'opp_new' };

test('legacy calls in progress are counted like the relational Tracker counts them', () => {
  const counted = store(['saved', 'submitted', 'accepted'], [
    { id: 'opp_lapsed', status: 'preparing', deadline: past },
    { id: 'opp_rolling', status: 'interested' },
  ]);
  assert.equal(legacyActiveTracked(counted, 'user_1'), 2, 'submitted, decided and lapsed calls do not count; rolling calls do');
});

test('the legacy save refuses a new call past the Free limit', async () => {
  await assert.rejects(
    assertLegacyTrackingAllowance(store(atLimit()), input, free),
    (error: unknown) => error instanceof TrackingLimitReachedError && error.limit === FREE_ACTIVE_TRACKED_LIMIT && error.active === FREE_ACTIVE_TRACKED_LIMIT,
  );
  await assertLegacyTrackingAllowance(store(atLimit().slice(1)), input, free);
});

test('re-saving a tracked call and paid plans are never limited', async () => {
  await assertLegacyTrackingAllowance(store(atLimit()), { ...input, opportunityId: 'opp_0' }, free);
  await assertLegacyTrackingAllowance(store(atLimit()), input, plus);
});

test('moving a submitted call back into progress needs a free place', async () => {
  const full = store(atLimit(), [{ id: 'opp_sent', status: 'submitted', deadline: future }]);
  const move = { ...input, opportunityId: 'opp_sent' };
  await assert.rejects(assertLegacyTrackingAllowance(full, { ...move, nextStatus: 'preparing' }, free), TrackingLimitReachedError);
  await assertLegacyTrackingAllowance(full, { ...move, nextStatus: 'accepted' }, free);
  await assertLegacyTrackingAllowance(full, { ...move, nextStatus: 'preparing' }, plus);
  // Moves between in-progress statuses never change the count.
  await assertLegacyTrackingAllowance(full, { ...input, opportunityId: 'opp_0', nextStatus: 'draft-started' }, free);
  // A call past its deadline never counts, so moving it takes no place.
  const lapsed = store(atLimit(), [{ id: 'opp_old', status: 'submitted', deadline: past }]);
  await assertLegacyTrackingAllowance(lapsed, { ...input, opportunityId: 'opp_old', nextStatus: 'preparing' }, free);
});
