import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, QueryResult } from 'pg';
import { createStore } from '@missa/radar-engine';
import { opportunityProjectionChanged, saveRadarStoreDeltaToPostgres } from '../src/postgresStore.js';

function fakePool(initialVersion = '0', taxonomyReady = false): { pool: Pool; calls: string[] } {
  const calls: string[] = [];
  const query = async (sql: string): Promise<QueryResult> => {
    calls.push(sql.trim().toLowerCase());
    if (sql.toLowerCase().includes('select version from missa_snapshot_versions')) {
      return { rows: [{ version: initialVersion }], rowCount: 1 } as unknown as QueryResult;
    }
    if (sql.toLowerCase().includes('select exists') && sql.toLowerCase().includes('information_schema.tables')) {
      return { rows: [{ present: taxonomyReady }], rowCount: 1 } as unknown as QueryResult;
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

test('derived rescoring does not force a full relational opportunity projection', () => {
  const previous = {
    id: 'opp_1',
    status: 'open',
    sourceId: 'src_1',
    sourceUrl: 'https://example.com/call',
    alternateSourceIds: [],
    createdAt: '2026-08-04T00:00:00.000Z',
    fields: { title: 'Call', type: 'open-call', genres: [], deadline: { kind: 'rolling' }, fee: { disclosed: false }, eligibility: [], requiredMaterials: [] },
    scores: { freshness: 80, confidence: 80, trust: 80 },
    trustSignals: [],
    lastCheckedAt: '2026-08-04T00:00:00.000Z',
    lastChangedAt: '2026-08-04T00:00:00.000Z',
    lastExtractionConfidence: 80,
    lastOpenSignal: true,
    lastClosedSignal: false,
    lastSuspiciousSignals: [],
    pastCycles: [],
    conflicts: [],
  } as any;
  const rescored = {
    ...previous,
    scores: { freshness: 79, confidence: 80, trust: 80 },
    trustSignals: [{ key: 'official', label: 'Official', present: true, weight: 10 }],
    prediction: { expectedOpenStart: '2026-08-05', expectedOpenEnd: '2026-08-06', confidence: 'low', basedOnCycles: 0 },
    lastCheckedAt: '2026-08-05T00:00:00.000Z',
  };

  assert.equal(opportunityProjectionChanged(previous, rescored), false);
  assert.equal(opportunityProjectionChanged(previous, { ...rescored, fields: { ...rescored.fields, title: 'Updated call' } }), true);
});
