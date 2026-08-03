import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { addOpportunityToCustomList, createCustomList, createStore, customListsForOpportunity, customListsForUser, CustomListValidationError, deleteCustomList, loadStore, opportunitiesForCustomList, saveStore, updateCustomList } from '../src/index.js';
import type { Opportunity } from '../src/domain/types.js';

function opportunity(id: string): Opportunity {
  return { id, createdAt: '2026-01-01T00:00:00.000Z', status: 'open', sourceId: 'source_1', sourceUrl: 'https://example.com', alternateSourceIds: [], scores: { freshness: 100, confidence: 100, trust: 100 }, trustSignals: [], lastCheckedAt: '2026-01-01T00:00:00.000Z', lastChangedAt: '2026-01-01T00:00:00.000Z', lastExtractionConfidence: 100, lastOpenSignal: true, lastClosedSignal: false, lastSuspiciousSignals: [], pastCycles: [], conflicts: [], fields: { title: `Opportunity ${id}`, type: 'magazine', genres: [], deadline: { kind: 'unknown' }, fee: { disclosed: false }, eligibility: [], requiredMaterials: [], contactEmailPresent: false } };
}

function setup() {
  const store = createStore();
  store.users.set('user_1', { id: 'user_1', displayName: 'Creator', attributes: {}, genres: [] });
  store.users.set('user_2', { id: 'user_2', displayName: 'Other', attributes: {}, genres: [] });
  store.opportunities.set('opp_1', opportunity('opp_1'));
  store.opportunities.set('opp_2', opportunity('opp_2'));
  store.tracked.push({ userId: 'user_1', opportunityId: 'opp_1', trackedAt: '2026-01-01T00:00:00.000Z', notify: true, myStatus: 'saved', events: [] });
  return store;
}

test('Lists are owner-scoped, names are unique, and memberships are idempotent', () => {
  const store = setup();
  const list = createCustomList(store, 'user_1', { name: '  This season  ', description: 'Priority calls', colorToken: 'coral' }, new Date('2026-02-01T00:00:00Z'));
  assert.equal(list.name, 'This season');
  assert.throws(() => createCustomList(store, 'user_1', { name: 'THIS SEASON' }), /already have/);
  const membership = addOpportunityToCustomList(store, 'user_1', list.id, 'opp_1', new Date('2026-02-01T00:00:00Z'));
  assert.equal(addOpportunityToCustomList(store, 'user_1', list.id, 'opp_1').addedAt, membership.addedAt);
  assert.deepEqual(customListsForOpportunity(store, 'user_1', 'opp_1').map((item) => item.id), [list.id]);
  assert.equal(opportunitiesForCustomList(store, 'user_1', list.id).length, 1);
  assert.deepEqual(customListsForUser(store, 'user_2'), []);
});

test('Untracked opportunities cannot be added and cross-user access is rejected', () => {
  const store = setup();
  const list = createCustomList(store, 'user_1', { name: 'Poetry' });
  assert.throws(() => addOpportunityToCustomList(store, 'user_1', list.id, 'opp_2'), /Track this opportunity/);
  assert.throws(() => addOpportunityToCustomList(store, 'user_2', list.id, 'opp_1'), /List not found/);
  assert.throws(() => updateCustomList(store, 'user_2', list.id, { name: 'Nope' }), /List not found/);
});

test('Archiving or deleting a List removes memberships without touching tracked data', () => {
  const store = setup();
  const list = createCustomList(store, 'user_1', { name: 'Archive me' });
  addOpportunityToCustomList(store, 'user_1', list.id, 'opp_1');
  updateCustomList(store, 'user_1', list.id, { archived: true });
  assert.equal(store.customListMemberships.size, 0);
  assert.equal(store.tracked.length, 1);
  assert.deepEqual(customListsForUser(store, 'user_1'), []);
  deleteCustomList(store, 'user_1', list.id);
  assert.equal(store.customLists.size, 0);
});

test('Lists and memberships survive JSON persistence', () => {
  const store = setup();
  const list = createCustomList(store, 'user_1', { name: 'Reload' });
  addOpportunityToCustomList(store, 'user_1', list.id, 'opp_1');
  const dir = mkdtempSync(join(tmpdir(), 'missa-lists-'));
  const file = join(dir, 'store.json');
  saveStore(store, file);
  const reloaded = loadStore(file);
  assert.equal(reloaded.customLists.get(list.id)?.name, 'Reload');
  assert.equal(reloaded.customListMemberships.size, 1);
  assert.equal(opportunitiesForCustomList(reloaded, 'user_1', list.id)[0]?.id, 'opp_1');
});

test('Invalid list input is rejected before writing a row', () => {
  const store = setup();
  assert.throws(() => createCustomList(store, 'user_1', { name: ' ' }), CustomListValidationError);
  assert.equal(store.customLists.size, 0);
});
