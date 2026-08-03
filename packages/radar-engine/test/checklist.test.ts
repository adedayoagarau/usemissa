import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addChecklistItem, ChecklistValidationError, createStore, deleteChecklistItem, opportunityChecklist, refreshOpportunityChecklist, updateChecklistItem } from '../src/index.js';
import { sequentialIds } from '../src/ports.js';
import type { Opportunity } from '../src/domain/types.js';

function fixture() {
  const store = createStore();
  store.users.set('user_1', { id: 'user_1', displayName: 'One', attributes: {}, genres: [] });
  store.users.set('user_2', { id: 'user_2', displayName: 'Two', attributes: {}, genres: [] });
  const opportunity: Opportunity = {
    id: 'opp_1', createdAt: '2026-01-01T00:00:00.000Z', status: 'open',
    fields: {
      title: 'Night River Award', type: 'award', genres: ['poetry'],
      deadline: { kind: 'exact', date: '2026-08-30' }, fee: { disclosed: true, amountCents: 0 },
      eligibility: [], requiredMaterials: ['Poetry manuscript', 'Short bio'], contactEmailPresent: false,
    }, sourceId: 'source_1', sourceUrl: 'https://example.test/call', alternateSourceIds: [],
    scores: { freshness: 100, confidence: 92, trust: 80 }, trustSignals: [], lastCheckedAt: '2026-01-01T00:00:00.000Z',
    lastChangedAt: '2026-01-01T00:00:00.000Z', lastExtractionConfidence: 92,
    lastOpenSignal: true, lastClosedSignal: false, lastSuspiciousSignals: [], pastCycles: [], conflicts: [],
  };
  store.opportunities.set(opportunity.id, opportunity);
  store.tracked.push({ userId: 'user_1', opportunityId: 'opp_1', trackedAt: '2026-01-10T00:00:00.000Z', notify: true, myStatus: 'saved', events: [] });
  return { store, ids: sequentialIds() };
}

test('tracking creates one private checklist from required materials', () => {
  const { store, ids } = fixture();
  const first = opportunityChecklist(store, 'user_1', 'opp_1', new Date('2026-01-10T00:00:00.000Z'), ids);
  const second = opportunityChecklist(store, 'user_1', 'opp_1', new Date('2026-01-11T00:00:00.000Z'), ids);
  assert.equal(first.checklist.id, second.checklist.id);
  assert.deepEqual(first.items.map((item) => item.label), ['Poetry manuscript', 'Short bio']);
  assert.equal(first.progress.total, 2);
  assert.equal(first.requirementsConfirmed, true);
  assert.equal(store.checklists.size, 1);
});

test('checklist updates are owner-scoped and Library references are private', () => {
  const { store, ids } = fixture();
  const view = opportunityChecklist(store, 'user_1', 'opp_1', new Date(), ids);
  const work = { id: 'work_1', userId: 'user_1', title: 'Night River', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
  store.libraryWorks.set(work.id, work);
  const item = updateChecklistItem(store, 'user_1', view.items[0]!.id, { state: 'complete', libraryWorkId: work.id }, new Date());
  assert.equal(item.state, 'complete');
  assert.equal(item.libraryWorkId, work.id);
  assert.throws(() => updateChecklistItem(store, 'user_2', item.id, { state: 'missing' }), /not found/);
  assert.throws(() => updateChecklistItem(store, 'user_1', view.items[1]!.id, { libraryWorkId: 'missing' }), ChecklistValidationError);
});

test('refresh preserves progress, adds requirements, and retains removed requirements as N/A', () => {
  const { store, ids } = fixture();
  const initial = opportunityChecklist(store, 'user_1', 'opp_1', new Date(), ids);
  updateChecklistItem(store, 'user_1', initial.items[0]!.id, { state: 'complete' }, new Date());
  store.opportunities.get('opp_1')!.fields.requiredMaterials = ['Poetry manuscript', 'Artist statement'];
  const refreshed = refreshOpportunityChecklist(store, 'user_1', 'opp_1', new Date('2026-02-01T00:00:00.000Z'), ids);
  const manuscript = refreshed.items.find((item) => item.normalizedKey === 'poetry manuscript');
  const bio = refreshed.items.find((item) => item.normalizedKey === 'short bio');
  const statement = refreshed.items.find((item) => item.normalizedKey === 'artist statement');
  assert.equal(manuscript?.state, 'complete');
  assert.equal(bio?.state, 'not-applicable');
  assert.equal(statement?.state, 'missing');
});

test('canonical rows become N/A while user-added rows can be deleted', () => {
  const { store, ids } = fixture();
  const initial = opportunityChecklist(store, 'user_1', 'opp_1', new Date(), ids);
  const personal = addChecklistItem(store, 'user_1', 'opp_1', { label: 'Grant budget' }, new Date(), ids);
  deleteChecklistItem(store, 'user_1', personal.id, new Date());
  deleteChecklistItem(store, 'user_1', initial.items[0]!.id, new Date());
  assert.equal(store.checklistItems.has(personal.id), false);
  assert.equal(store.checklistItems.get(initial.items[0]!.id)?.state, 'not-applicable');
});

test('untracked opportunities and missing requirements are honest', () => {
  const { store, ids } = fixture();
  assert.throws(() => opportunityChecklist(store, 'user_2', 'opp_1', new Date(), ids), /Track this opportunity/);
  store.tracked.push({ userId: 'user_2', opportunityId: 'opp_1', trackedAt: new Date().toISOString(), notify: true, myStatus: 'saved', events: [] });
  store.opportunities.get('opp_1')!.fields.requiredMaterials = [];
  const view = opportunityChecklist(store, 'user_2', 'opp_1', new Date(), ids);
  assert.equal(view.requirementsConfirmed, false);
  assert.equal(view.items.length, 0);
});
