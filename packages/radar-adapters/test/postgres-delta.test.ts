import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, QueryResult } from 'pg';
import { createStore } from '@missa/radar-engine';
import { saveRadarStoreDeltaToPostgres } from '../src/postgresStore.js';

function fakePool(initialVersion = '0'): { pool: Pool; calls: string[] } {
  const calls: string[] = [];
  const query = async (sql: string): Promise<QueryResult> => {
    calls.push(sql.trim().toLowerCase());
    if (sql.toLowerCase().includes('select version from missa_snapshot_versions')) {
      return { rows: [{ version: initialVersion }], rowCount: 1 } as unknown as QueryResult;
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
