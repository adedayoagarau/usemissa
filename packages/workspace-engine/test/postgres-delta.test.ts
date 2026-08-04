import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, QueryResult } from 'pg';
import { createStore } from '../src/store/store.js';
import { saveStoreDeltaToPostgres } from '../src/db/postgresStore.js';

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

test('Workspace delta persistence upserts changed rows without deleting the snapshot', async () => {
  const previous = createStore();
  const current = createStore();
  current.entities.set('entity_1', {
    id: 'entity_1',
    organizationId: 'org_1',
    name: 'North River',
    createdAt: '2026-08-04T00:00:00.000Z',
  });
  const { pool, calls } = fakePool('4');

  const nextVersion = await saveStoreDeltaToPostgres(current, previous, pool, 4);

  assert.equal(nextVersion, 5);
  assert.ok(calls.some((sql) => sql.startsWith('insert into entities') && sql.includes('on conflict')));
  assert.ok(!calls.some((sql) => sql.startsWith('delete from entities')));
});

test('Workspace delta persistence records explicit deletions only', async () => {
  const previous = createStore();
  previous.submissionDrafts.set('draft_1', {
    id: 'draft_1',
    submissionPathId: 'path_1',
    submitterAccountId: 'acct_1',
    answers: {},
    workTitles: ['Work'],
    updatedAt: '2026-08-01T00:00:00.000Z',
    expiresAt: '2026-08-31T00:00:00.000Z',
  });
  const { pool, calls } = fakePool('9');

  const nextVersion = await saveStoreDeltaToPostgres(createStore(), previous, pool, 9);

  assert.equal(nextVersion, 10);
  assert.ok(calls.some((sql) => sql === 'delete from submission_drafts where id = $1'));
});
