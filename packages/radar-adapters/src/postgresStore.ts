import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Pool } from 'pg';
import { createStore, type RadarStore } from '@missa/radar-engine';

const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), 'postgresSchema.sql');

/** Creates the Radar tables (idempotent — safe to call on every boot). */
export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(schema);
}

/**
 * Postgres-backed persistence for `RadarStore`. Same read-whole/write-whole
 * contract as `loadStore`/`saveStore` (the JSON-file adapter in the core
 * package) — the engine itself stays synchronous, in-memory Maps; this just
 * gives the process a durable, queryable backing store to load from on boot
 * and flush to after each tick, same as the file adapter does today.
 */
export async function saveStoreToPostgres(store: RadarStore, pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    await client.query('delete from radar_sources');
    for (const s of store.sources.values()) {
      await client.query(
        'insert into radar_sources (id, organization_id, active, data) values ($1, $2, $3, $4)',
        [s.id, s.organizationId ?? null, s.active, s],
      );
    }

    await client.query('delete from radar_snapshots');
    for (const s of store.snapshots.values()) {
      await client.query('insert into radar_snapshots (id, source_id, data) values ($1, $2, $3)', [s.id, s.sourceId, s]);
    }

    await client.query('delete from radar_opportunities');
    for (const o of store.opportunities.values()) {
      await client.query(
        'insert into radar_opportunities (id, status, claimed_by_organization_id, data) values ($1, $2, $3, $4)',
        [o.id, o.status, o.claimedByOrganizationId ?? null, o],
      );
    }

    await client.query('delete from radar_opportunity_versions');
    for (const v of store.versions.values()) {
      await client.query(
        'insert into radar_opportunity_versions (id, opportunity_id, data) values ($1, $2, $3)',
        [v.id, v.opportunityId, v],
      );
    }

    await client.query('delete from radar_opportunity_changes');
    for (const c of store.changes.values()) {
      await client.query(
        'insert into radar_opportunity_changes (id, opportunity_id, data) values ($1, $2, $3)',
        [c.id, c.opportunityId, c],
      );
    }

    await client.query('delete from radar_organizations');
    for (const o of store.organizations.values()) {
      await client.query('insert into radar_organizations (id, data) values ($1, $2)', [o.id, o]);
    }

    await client.query('delete from radar_claims');
    for (const c of store.claims.values()) {
      await client.query(
        'insert into radar_claims (id, organization_id, opportunity_id, status, data) values ($1, $2, $3, $4, $5)',
        [c.id, c.organizationId, c.opportunityId, c.status, c],
      );
    }

    await client.query('delete from radar_verification_tasks');
    for (const t of store.verificationTasks.values()) {
      await client.query('insert into radar_verification_tasks (id, status, data) values ($1, $2, $3)', [t.id, t.status, t]);
    }

    await client.query('delete from radar_profiles');
    for (const p of store.radarProfiles.values()) {
      await client.query('insert into radar_profiles (id, user_id, data) values ($1, $2, $3)', [p.id, p.userId, p]);
    }

    await client.query('delete from radar_users');
    for (const u of store.users.values()) {
      await client.query('insert into radar_users (id, data) values ($1, $2)', [u.id, u]);
    }

    await client.query('delete from radar_follows');
    for (const f of store.follows) {
      await client.query('insert into radar_follows (user_id, organization_id, data) values ($1, $2, $3)', [f.userId, f.organizationId, f]);
    }

    await client.query('delete from radar_tracked');
    for (const t of store.tracked) {
      await client.query('insert into radar_tracked (user_id, opportunity_id, data) values ($1, $2, $3)', [t.userId, t.opportunityId, t]);
    }

    await client.query('delete from radar_alerts');
    for (const a of store.alerts.values()) {
      await client.query('insert into radar_alerts (id, data) values ($1, $2)', [a.id, a]);
    }

    await client.query('delete from radar_emitted_alert_keys');
    for (const key of store.emittedAlertKeys) {
      await client.query('insert into radar_emitted_alert_keys (key) values ($1)', [key]);
    }

    await client.query('delete from radar_accounts');
    for (const a of store.accounts.values()) {
      await client.query('insert into radar_accounts (id, email, data) values ($1, $2, $3)', [a.id, a.email, a]);
    }

    await client.query('delete from radar_memberships');
    for (const m of store.memberships) {
      await client.query(
        'insert into radar_memberships (account_id, organization_id, data) values ($1, $2, $3)',
        [m.accountId, m.organizationId, m],
      );
    }

    await client.query('delete from radar_audit_log');
    for (const entry of store.auditLog) {
      await client.query('insert into radar_audit_log (id, at, data) values ($1, $2, $3)', [entry.id, entry.at, entry]);
    }

    await client.query('delete from radar_pieces');
    for (const p of store.pieces.values()) {
      await client.query('insert into radar_pieces (id, user_id, data) values ($1, $2, $3)', [p.id, p.userId, p]);
    }

    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function loadStoreFromPostgres(pool: Pool): Promise<RadarStore> {
  const store = createStore();

  const [
    sources, snapshots, opportunities, versions, changes, organizations, claims, verificationTasks,
    profiles, users, follows, tracked, alerts, alertKeys, accounts, memberships, auditLog, pieces,
  ] = await Promise.all([
    pool.query('select data from radar_sources'),
    pool.query('select data from radar_snapshots'),
    pool.query('select data from radar_opportunities'),
    pool.query('select data from radar_opportunity_versions'),
    pool.query('select data from radar_opportunity_changes'),
    pool.query('select data from radar_organizations'),
    pool.query('select data from radar_claims'),
    pool.query('select data from radar_verification_tasks'),
    pool.query('select data from radar_profiles'),
    pool.query('select data from radar_users'),
    pool.query('select data from radar_follows'),
    pool.query('select data from radar_tracked'),
    pool.query('select data from radar_alerts'),
    pool.query('select key from radar_emitted_alert_keys'),
    pool.query('select data from radar_accounts'),
    pool.query('select data from radar_memberships'),
    pool.query('select data from radar_audit_log order by at asc'),
    pool.query('select data from radar_pieces'),
  ]);

  for (const row of sources.rows) store.sources.set(row.data.id, row.data);
  for (const row of snapshots.rows) store.snapshots.set(row.data.id, row.data);
  for (const row of opportunities.rows) store.opportunities.set(row.data.id, row.data);
  for (const row of versions.rows) store.versions.set(row.data.id, row.data);
  for (const row of changes.rows) store.changes.set(row.data.id, row.data);
  for (const row of organizations.rows) store.organizations.set(row.data.id, row.data);
  for (const row of claims.rows) store.claims.set(row.data.id, row.data);
  for (const row of verificationTasks.rows) store.verificationTasks.set(row.data.id, row.data);
  for (const row of profiles.rows) store.radarProfiles.set(row.data.id, row.data);
  for (const row of users.rows) store.users.set(row.data.id, row.data);
  store.follows = follows.rows.map((r) => r.data);
  store.tracked = tracked.rows.map((r) => r.data);
  for (const row of alerts.rows) store.alerts.set(row.data.id, row.data);
  store.emittedAlertKeys = new Set(alertKeys.rows.map((r) => r.key));
  for (const row of accounts.rows) store.accounts.set(row.data.id, row.data);
  store.memberships = memberships.rows.map((r) => r.data);
  store.auditLog = auditLog.rows.map((r) => r.data);
  for (const row of pieces.rows) store.pieces.set(row.data.id, row.data);

  return store;
}
