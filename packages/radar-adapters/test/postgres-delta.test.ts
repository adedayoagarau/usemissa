import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, QueryResult } from 'pg';
import { createStore, type Opportunity, type Source } from '@missa/radar-engine';
import { saveRadarStoreDeltaToPostgres } from '../src/postgresStore.js';

function fakePool(initialVersion = '0', taxonomyReady = false, opportunityPreferencesReady = false): { pool: Pool; calls: string[] } {
  const calls: string[] = [];
  const query = async (sql: string, params?: unknown[]): Promise<QueryResult> => {
    calls.push(sql.trim().toLowerCase());
    if (sql.toLowerCase().includes('select version from missa_snapshot_versions')) {
      return { rows: [{ version: initialVersion }], rowCount: 1 } as unknown as QueryResult;
    }
    if (sql.toLowerCase().includes('select exists') && sql.toLowerCase().includes('information_schema.tables')) {
      const table = params?.[0];
      const present = table === 'account_taxonomy_preferences' ? taxonomyReady : table === 'opportunity_preferences' ? opportunityPreferencesReady : false;
      return { rows: [{ present }], rowCount: 1 } as unknown as QueryResult;
    }
    return { rows: [], rowCount: 0 } as unknown as QueryResult;
  };
  return {
    pool: {
      connect: async () => ({ query, release: () => {} }),
      query,
    } as unknown as Pool,
    calls,
  };
}

test('Radar delta persistence writes changed user rows without clearing the snapshot', async () => {
  const previous = createStore();
  const current = createStore();
  current.tracked.push({ userId: 'user_1', opportunityId: 'opp_1', trackedAt: '2026-08-04T00:00:00.000Z', notify: true, myStatus: 'interested', events: [] });
  const { pool, calls } = fakePool('3');

  const nextVersion = await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.equal(nextVersion, 4);
  assert.ok(calls.some((sql) => sql.startsWith('insert into radar_tracked') && sql.includes('on conflict')));
  assert.ok(!calls.some((sql) => sql === 'delete from radar_tracked'));
});

test('Radar delta persistence ignores object key order', async () => {
  const previous = createStore();
  const current = createStore();
  previous.sources.set('source_1', {
    id: 'source_1',
    name: 'Source',
    url: 'https://example.org/calls',
    kind: 'directory',
    active: true,
    checkIntervalHours: 24,
    consecutiveFailures: 0,
    registryTrust: { score: 50, status: 'needs-review', authorityKind: 'directory' },
  });
  current.sources.set('source_1', {
    id: 'source_1',
    name: 'Source',
    url: 'https://example.org/calls',
    kind: 'directory',
    active: true,
    checkIntervalHours: 24,
    consecutiveFailures: 0,
    registryTrust: { status: 'needs-review', authorityKind: 'directory', score: 50 },
  });
  const { pool, calls } = fakePool('3');

  const nextVersion = await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.equal(nextVersion, 3);
  assert.deepEqual(calls, []);
});

test('Radar delta persistence does not rewrite opportunities for source scheduling metadata', async () => {
  const previous = createStore();
  const current = createStore();
  const source: Source = {
    id: 'source_1',
    name: 'Source',
    url: 'https://example.org/calls',
    kind: 'directory',
    active: true,
    checkIntervalHours: 24,
    consecutiveFailures: 0,
  };
  previous.sources.set(source.id, source);
  current.sources.set(source.id, { ...source, nextCheckAt: '2026-08-18T00:00:00.000Z' });
  const opportunity: Opportunity = {
    id: 'opp_1',
    createdAt: '2026-08-01T00:00:00.000Z',
    status: 'open',
    fields: {
      title: 'Open call',
      type: 'grant',
      genres: [],
      deadline: { kind: 'rolling' },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: source.id,
    sourceUrl: source.url,
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 80, trust: 70 },
    trustSignals: [],
    lastCheckedAt: '2026-08-01T00:00:00.000Z',
    lastChangedAt: '2026-08-01T00:00:00.000Z',
    lastExtractionConfidence: 80,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
  previous.opportunities.set(opportunity.id, opportunity);
  current.opportunities.set(opportunity.id, opportunity);
  const { pool, calls } = fakePool('3');

  await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.ok(calls.some((sql) => sql.startsWith('insert into radar_sources')));
  assert.ok(!calls.some((sql) => sql.startsWith('insert into opportunities')));
});

test('Radar delta persistence bulk-writes score changes without re-projecting canonical opportunities', async () => {
  const previous = createStore();
  const current = createStore();
  const source: Source = {
    id: 'source_1',
    name: 'Source',
    url: 'https://example.org/calls',
    kind: 'directory',
    active: true,
    checkIntervalHours: 24,
    consecutiveFailures: 0,
  };
  previous.sources.set(source.id, source);
  current.sources.set(source.id, source);
  const opportunity: Opportunity = {
    id: 'opp_1',
    createdAt: '2026-08-01T00:00:00.000Z',
    status: 'open',
    fields: {
      title: 'Open call',
      type: 'grant',
      genres: [],
      deadline: { kind: 'rolling' },
      fee: { disclosed: false },
      eligibility: [],
      requiredMaterials: [],
      contactEmailPresent: false,
    },
    sourceId: source.id,
    sourceUrl: source.url,
    alternateSourceIds: [],
    scores: { freshness: 100, confidence: 80, trust: 70 },
    trustSignals: [],
    lastCheckedAt: '2026-08-01T00:00:00.000Z',
    lastChangedAt: '2026-08-01T00:00:00.000Z',
    lastExtractionConfidence: 80,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  };
  previous.opportunities.set(opportunity.id, opportunity);
  current.opportunities.set(opportunity.id, { ...opportunity, scores: { ...opportunity.scores, freshness: 99 } });
  const { pool, calls } = fakePool('3');

  await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.ok(calls.some((sql) => sql.startsWith('insert into radar_opportunities')));
  assert.ok(!calls.some((sql) => sql.startsWith('insert into opportunities')));
});

test('Radar delta persistence dual-writes changed taxonomy exclusions', async () => {
  const previous = createStore();
  const current = createStore();
  const account = { id: 'acct_1', email: 'creator@example.com', passwordHash: 'salt:hash', userId: 'user_1', isAdmin: false, createdAt: '2026-08-04T00:00:00.000Z' } as const;
  previous.accounts.set(account.id, account);
  current.accounts.set(account.id, account);
  previous.users.set('user_1', { id: 'user_1', displayName: 'Creator', attributes: {}, genres: [] });
  current.users.set('user_1', { id: 'user_1', displayName: 'Creator', attributes: {}, genres: [], taxonomyPreferences: [{ termId: 'taxterm_disc-poetry', preference: 'exclude', weight: 100 }] });
  const { pool, calls } = fakePool('3', true);

  await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.ok(calls.some((sql) => sql.includes("delete from account_taxonomy_preferences where account_id = $1 and origin = 'explicit'")));
  assert.ok(calls.some((sql) => sql.startsWith('insert into account_taxonomy_preferences')));
});

test('Radar delta persistence dual-writes creator opportunity preferences when the target table is ready', async () => {
  const previous = createStore();
  const current = createStore();
  const account = { id: 'acct_1', email: 'creator@example.com', passwordHash: 'salt:hash', userId: 'user_1', isAdmin: false, createdAt: '2026-08-04T00:00:00.000Z' } as const;
  previous.accounts.set(account.id, account);
  current.accounts.set(account.id, account);
  previous.users.set('user_1', { id: 'user_1', displayName: 'Creator', attributes: {}, genres: [] });
  current.users.set('user_1', {
    id: 'user_1', displayName: 'Creator', attributes: {}, genres: [],
    opportunityPreferences: { types: ['magazine'], disciplines: [], genres: [], locations: ['Nigeria'], careerStages: ['emerging'], noFeeOnly: true, deadlineWithinDays: 30, simultaneousRequired: false },
  });
  const { pool, calls } = fakePool('3', false, true);

  await saveRadarStoreDeltaToPostgres(current, previous, pool, 3);

  assert.ok(calls.some((sql) => sql.startsWith('insert into opportunity_preferences')));
});
