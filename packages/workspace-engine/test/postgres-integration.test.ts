import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { createStore } from '../src/store/store.js';
import { ensurePostgresSchema, saveStoreToPostgres, loadStoreFromPostgres } from '../src/db/postgresStore.js';

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

    const store = createStore();
    store.entities.set('entity_1', {
      id: 'entity_1',
      organizationId: 'org_1',
      name: 'Real PG Test Team',
      createdAt: new Date().toISOString(),
    });
    store.programs.set('program_1', {
      id: 'program_1',
      entityId: 'entity_1',
      name: 'Real PG Test Program',
      createdAt: new Date().toISOString(),
    });

    await saveStoreToPostgres(store, pool);
    const loaded = await loadStoreFromPostgres(pool);

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
