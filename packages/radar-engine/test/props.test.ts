import test from 'node:test';
import assert from 'node:assert/strict';
import { propsForUser, createStore } from '../src/index.js';

test('props celebrate private progress without negative outcomes', () => {
  const store = createStore();
  store.tracked.push(
    { userId: 'user_1', opportunityId: 'opp_1', trackedAt: '2026-08-01T00:00:00.000Z', notify: true, myStatus: 'saved', events: [] },
    { userId: 'user_1', opportunityId: 'opp_2', trackedAt: '2026-08-02T00:00:00.000Z', notify: true, myStatus: 'submitted', events: [] },
  );
  const props = propsForUser(store, 'user_1');
  assert.equal(props.some((prop) => prop.id === 'first-opportunity'), true);
  assert.equal(props.some((prop) => prop.id === 'first-submission'), true);
  assert.equal(props.some((prop) => prop.title.toLowerCase().includes('rejected')), false);
});
