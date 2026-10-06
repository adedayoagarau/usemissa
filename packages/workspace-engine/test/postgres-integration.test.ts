import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { createStore } from '../src/store/store.js';
import { ensurePostgresSchema, readSnapshotVersion, saveStoreToPostgres, saveStoreDeltaToPostgres, loadStoreFromPostgres, SnapshotConflictError } from '../src/db/postgresStore.js';
import { cloneStore } from '../src/store/store.js';
import { WorkspaceEngine } from '../src/engine.js';

/**
 * Real-Postgres round trip, mirroring
 * packages/radar-adapters/test/postgres-integration.test.ts's pattern --
 * requires DATABASE_URL and is skipped (not failed) when it's absent.
 */
const databaseUrl = process.env.DATABASE_URL;

test('ensurePostgresSchema + save/load round-trip against a real Postgres connection', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensurePostgresSchema(pool);
    await pool.query(
      `insert into radar_organizations (id, data)
       values ('org_1', '{}')
       on conflict (id) do nothing`,
    );

    const store = createStore();
    store.entities.set('entity_1', {
      id: 'entity_1',
      organizationId: 'org_1',
      name: 'Real PG Test Team',
      // Explicit undefined, not omitted -- matches the shape
      // WorkspaceEngine.createEntity's own object literal actually produces
      // when no label is passed, which is what loadStoreFromPostgres's
      // column-by-column reconstruction is compared against here.
      label: undefined,
      createdAt: new Date().toISOString(),
    });
    store.programs.set('program_1', {
      id: 'program_1',
      entityId: 'entity_1',
      name: 'Real PG Test Program',
      createdAt: new Date().toISOString(),
    });

    const initialVersion = await readSnapshotVersion(pool);
    const savedVersion = await saveStoreToPostgres(store, pool, initialVersion);
    assert.equal(savedVersion, initialVersion + 1);
    const loaded = await loadStoreFromPostgres(pool);

    await assert.rejects(
      () => saveStoreToPostgres(store, pool, initialVersion),
      (error: unknown) => error instanceof SnapshotConflictError,
      'a stale snapshot must not overwrite a newer write',
    );

    assert.deepEqual(loaded.entities.get('entity_1'), store.entities.get('entity_1'));
    assert.deepEqual(loaded.programs.get('program_1'), store.programs.get('program_1'));

    // Running ensurePostgresSchema a second time must not fail or duplicate data.
    await ensurePostgresSchema(pool);
    const reloaded = await loadStoreFromPostgres(pool);
    assert.equal(reloaded.entities.size, loaded.entities.size);
  } finally {
    await pool.end();
  }
});

test('delta save updates an existing submission that has no idempotency key', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensurePostgresSchema(pool);
    await pool.query(`insert into radar_organizations (id, data) values ('org_delta', '{}') on conflict (id) do nothing`);
    const engine = new WorkspaceEngine();
    const team = engine.createEntity('org_delta', 'Delta team');
    const program = engine.createProgram(team.id, 'Delta program');
    const call = engine.createOpenCall(program.id, 'Delta call');
    const path = engine.createSubmissionPath(call.id, [], []);
    const submission = engine.createSubmission(path.id, 'acct_delta', [{ title: 'First' }]);
    const version = await saveStoreToPostgres(engine.store, pool);
    const before = cloneStore(engine.store);
    engine.store.submissions.get(submission.id)!.answers = { note: 'changed' };
    engine.store.submissions.get(submission.id)!.status = 'withdrawn';
    await saveStoreDeltaToPostgres(engine.store, before, pool, version);
    const loaded = await loadStoreFromPostgres(pool);
    assert.deepEqual(loaded.submissions.get(submission.id)!.answers, { note: 'changed' });
    assert.equal(loaded.submissions.get(submission.id)!.status, 'withdrawn');
  } finally {
    await pool.end();
  }
});
