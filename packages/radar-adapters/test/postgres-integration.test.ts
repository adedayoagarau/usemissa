import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { createStore } from '@missa/radar-engine';
import { ensurePostgresSchema, saveStoreToPostgres, loadStoreFromPostgres } from '../src/postgresStore.js';

/**
 * Unlike adapters.test.ts's postgresStore round-trip test (which uses a
 * fakePool in-memory mock so it can run everywhere), this test exercises a
 * *real* Postgres connection end to end: schema creation + save + load.
 *
 * It requires DATABASE_URL and is skipped (not failed) when it's absent, so
 * local dev without a running Postgres still works — CI's postgres-integration
 * job (.github/workflows/ci.yml) sets DATABASE_URL against a service
 * container specifically so this test actually runs there. This is the real
 * verification for Story 1.4 ("Postgres as the default runtime store") —
 * the fakePool test only proves the save/load logic is correct in isolation,
 * not that it actually works against a real database (schema creation,
 * column types, real round-trip encoding).
 */
const databaseUrl = process.env.DATABASE_URL;

test('ensurePostgresSchema + save/load round-trip against a real Postgres connection', { skip: !databaseUrl }, async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensurePostgresSchema(pool);

    const store = createStore();
    store.organizations.set('org_1', { id: 'org_1', name: 'Real PG Test Org', domains: ['realpg.test'], verified: true });
    store.users.set('user_1', { id: 'user_1', displayName: 'Real PG Test User', genres: ['poetry'], attributes: {} });

    await saveStoreToPostgres(store, pool);
    const loaded = await loadStoreFromPostgres(pool);

    assert.deepEqual(loaded.organizations.get('org_1'), store.organizations.get('org_1'));
    assert.deepEqual(loaded.users.get('user_1'), store.users.get('user_1'));

    // Running ensurePostgresSchema a second time must not fail or duplicate data —
    // this is what makes it safe to call on every cold start in production.
    await ensurePostgresSchema(pool);
    const reloaded = await loadStoreFromPostgres(pool);
    assert.equal(reloaded.organizations.size, loaded.organizations.size);
  } finally {
    await pool.end();
  }
});
