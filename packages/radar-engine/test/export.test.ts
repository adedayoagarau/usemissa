import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, FixtureFetcher, RadarEngine, type Opportunity } from '../src/index.js';

function opportunity(id: string): Opportunity {
  return {
    id,
    createdAt: '2026-08-01T00:00:00.000Z',
    status: 'open',
    fields: {
      title: 'A, "good" call',
      organizationName: 'Example Org',
      type: 'magazine',
      genres: ['poetry'],
      deadline: { kind: 'exact', date: '2026-09-01' },
      fee: { amountCents: 0, currency: 'USD', disclosed: true },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: 'source_1',
    sourceUrl: 'https://example.test/call',
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 100, trust: 100 },
    trustSignals: [],
    lastCheckedAt: '2026-08-01T00:00:00.000Z',
    lastChangedAt: '2026-08-01T00:00:00.000Z',
    lastExtractionConfidence: 100,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
}

test('tracker export is own-user scoped, deterministic, and retains missing opportunity history', () => {
  const store = createStore();
  const engine = new RadarEngine({ store, fetcher: new FixtureFetcher() });
  engine.addUser({ id: 'user-a', displayName: 'Ada', genres: [], attributes: {} });
  engine.addUser({ id: 'user-b', displayName: 'Bia', genres: [], attributes: {} });
  store.opportunities.set('opp-a', opportunity('opp-a'));
  const events = [{ at: '2026-08-01T01:00:00.000Z', to: 'saved' as const, source: 'user' as const, note: 'Keep this' }];
  store.tracked.push(
    { userId: 'user-b', opportunityId: 'opp-b', trackedAt: '2026-08-01T00:00:00.000Z', notify: true, myStatus: 'saved', events: [] },
    { userId: 'user-a', opportunityId: 'opp-missing', trackedAt: '2026-08-01T02:00:00.000Z', notify: true, myStatus: 'submitted', submittedAt: '2026-08-01T03:00:00.000Z', events },
    { userId: 'user-a', opportunityId: 'opp-a', trackedAt: '2026-08-01T01:00:00.000Z', notify: true, myStatus: 'saved', events: [] },
  );
  const before = JSON.parse(JSON.stringify(store.tracked));

  const result = engine.exportTracker('user-a', new Date('2026-08-02T10:00:00.000Z'));
  assert.deepEqual(result, {
    exportVersion: 1,
    generatedAt: '2026-08-02T10:00:00.000Z',
    included: ['tracker'],
    omitted: ['library'],
    tracker: [
      {
        opportunityId: 'opp-a', title: 'A, "good" call', organizationName: 'Example Org', type: 'magazine', opportunityStatus: 'open', myStatus: 'saved', trackedAt: '2026-08-01T01:00:00.000Z', deadline: '2026-09-01', deadlineKind: 'exact', sourceUrl: 'https://example.test/call', dataState: 'available', statusEvents: [],
      },
      {
        opportunityId: 'opp-missing', myStatus: 'submitted', trackedAt: '2026-08-01T02:00:00.000Z', submittedAt: '2026-08-01T03:00:00.000Z', dataState: 'unavailable', statusEvents: events,
      },
    ],
  });
  assert.deepEqual(store.tracked, before, 'projection must not mutate tracker rows');
  assert.throws(() => engine.exportTracker('unknown'), /Unknown user/);
});
