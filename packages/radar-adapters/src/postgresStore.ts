import type { Pool, PoolClient } from 'pg';
import { createStore, type OpportunityType, type RadarStore } from '@missa/radar-engine';
import { postgresSchema } from './postgresSchema.js';
import { saveOpportunityProjectionToPostgres } from './opportunityRelationalStore.js';

export const RADAR_SNAPSHOT_DOMAIN = 'radar';

export class SnapshotConflictError extends Error {
  readonly domain: string;
  readonly expectedVersion: number;
  readonly currentVersion: number;

  constructor(domain: string, expectedVersion: number, currentVersion: number) {
    super(`The ${domain} snapshot changed before this write completed`);
    this.name = 'SnapshotConflictError';
    this.domain = domain;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

/** Creates the Radar tables (idempotent — safe to call on every boot). */
export async function ensurePostgresSchema(pool: Pool): Promise<void> {
  await pool.query(postgresSchema);
}

async function hasColumn(client: PoolClient, table: string, column: string): Promise<boolean> {
  const result = await client.query(
    `select exists (
      select 1 from information_schema.columns
      where table_schema = current_schema() and table_name = $1 and column_name = $2
    ) as present`,
    [table, column],
  );
  return result.rows[0]?.present === true;
}

async function hasTable(client: PoolClient, table: string): Promise<boolean> {
  const result = await client.query(
    `select exists (
      select 1 from information_schema.tables
      where table_schema = current_schema() and table_name = $1
    ) as present`,
    [table],
  );
  return result.rows[0]?.present === true;
}

/** Dual-write private user preferences once the additive taxonomy tables have
 * been rehearsed. Legacy genres stay in radar_users until cutover parity is
 * proven; explicit rows never expose public profile data. */
async function writeAccountTaxonomyPreferences(client: PoolClient, store: RadarStore, deletedAccountIds: string[] = []): Promise<void> {
  if (process.env.MISSA_TAXONOMY_PERSISTENCE === '0' || !(await hasTable(client, 'account_taxonomy_preferences'))) return;
  for (const accountId of deletedAccountIds) {
    await client.query(`delete from account_taxonomy_preferences where account_id = $1 and origin = 'explicit'`, [accountId]);
  }
  for (const account of store.accounts.values()) {
    if (!account.userId) continue;
    const user = store.users.get(account.userId);
    if (!user?.taxonomyPreferences) continue;
    await client.query(`delete from account_taxonomy_preferences where account_id = $1 and origin = 'explicit'`, [account.id]);
    for (const preference of user.taxonomyPreferences) {
      await client.query(
        `insert into account_taxonomy_preferences
           (account_id, term_id, preference, weight, origin, updated_at)
         values ($1, $2, $3, $4, 'explicit', now())
         on conflict (account_id, term_id) do update set
           preference = excluded.preference,
           weight = excluded.weight,
           origin = 'explicit',
           updated_at = now()`,
        [account.id, preference.termId, preference.preference, preference.weight],
      );
    }
  }
}

/** Dual-write creator opportunity preferences when the additive target table
 * is present. The compatibility user snapshot remains authoritative until
 * the wider row-level cutover is approved. */
async function writeOpportunityPreferences(client: PoolClient, store: RadarStore, deletedAccountIds: string[] = []): Promise<void> {
  if (!(await hasTable(client, 'opportunity_preferences'))) return;
  for (const accountId of deletedAccountIds) {
    await client.query('delete from opportunity_preferences where account_id = $1', [accountId]);
  }
  for (const account of store.accounts.values()) {
    if (!account.userId) continue;
    const preferences = store.users.get(account.userId)?.opportunityPreferences;
    if (!preferences) {
      await client.query('delete from opportunity_preferences where account_id = $1', [account.id]);
      continue;
    }
    await client.query(
      `insert into opportunity_preferences
         (account_id, types, disciplines, genres, locations, career_stages, max_fee_cents, no_fee_only, deadline_within_days, simultaneous_required, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       on conflict (account_id) do update set
         types = excluded.types,
         disciplines = excluded.disciplines,
         genres = excluded.genres,
         locations = excluded.locations,
         career_stages = excluded.career_stages,
         max_fee_cents = excluded.max_fee_cents,
         no_fee_only = excluded.no_fee_only,
         deadline_within_days = excluded.deadline_within_days,
         simultaneous_required = excluded.simultaneous_required,
         updated_at = now()`,
      [
        account.id,
        preferences.types,
        preferences.disciplines,
        preferences.genres,
        preferences.locations,
        preferences.careerStages,
        preferences.maxFeeCents ?? null,
        preferences.noFeeOnly,
        preferences.deadlineWithinDays ?? null,
        preferences.simultaneousRequired,
      ],
    );
  }
}

/**
 * Postgres-backed persistence for `RadarStore`. Same read-whole/write-whole
 * contract as `loadStore`/`saveStore` (the JSON-file adapter in the core
 * package) — the engine itself stays synchronous, in-memory Maps; this just
 * gives the process a durable, queryable backing store to load from on boot
 * and flush to after each tick, same as the file adapter does today. A
 * snapshot version rejects stale writers instead of silently overwriting a
 * newer serverless snapshot.
 */
export async function saveStoreToPostgres(store: RadarStore, pool: Pool, expectedVersion?: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('missa.radar.snapshot'))");
    const versionRow = await client.query<{ version: string }>(
      'select version from missa_snapshot_versions where domain = $1 for update',
      [RADAR_SNAPSHOT_DOMAIN],
    );
    const currentVersion = Number(versionRow.rows[0]?.version ?? 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new SnapshotConflictError(RADAR_SNAPSHOT_DOMAIN, expectedVersion, currentVersion);
    }
    const membershipsHaveRole = await hasColumn(client, 'radar_memberships', 'role');

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

    // Organizations and accounts are parents of Workspace rows in ADR-001's
    // target schema. Upsert them without clearing the table so the compatibility
    // writer cannot cascade-delete or violate foreign keys owned by Workspace.
    for (const o of store.organizations.values()) {
      await client.query(
        'insert into radar_organizations (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data',
        [o.id, o],
      );
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

    await client.query('delete from radar_manual_tracker_entries');
    for (const entry of store.manualTrackerEntries) {
      await client.query('insert into radar_manual_tracker_entries (id, user_id, data) values ($1, $2, $3)', [entry.id, entry.userId, entry]);
    }

    await client.query('delete from radar_forwarding_addresses');
    for (const address of store.forwardingAddresses) {
      await client.query('insert into radar_forwarding_addresses (id, user_id, status, data) values ($1, $2, $3, $4)', [address.id, address.userId, address.status, address]);
    }
    await client.query('delete from radar_email_candidates');
    for (const candidate of store.emailCandidates) {
      await client.query('insert into radar_email_candidates (id, user_id, forwarding_address_id, provider, provider_message_id, gmail_connection_id, gmail_message_id, state, data) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [candidate.id, candidate.userId, candidate.forwardingAddressId ?? null, candidate.provider, candidate.providerMessageId, candidate.gmailConnectionId ?? null, candidate.gmailMessageId ?? null, candidate.state, candidate]);
    }
    await client.query('delete from radar_gmail_connections');
    for (const connection of store.gmailConnections) {
      await client.query('insert into radar_gmail_connections (id, user_id, google_subject_id, status, data) values ($1, $2, $3, $4, $5)', [connection.id, connection.userId, connection.googleSubjectId, connection.status, connection]);
    }
    await client.query('delete from radar_gmail_sync_jobs');
    for (const job of store.gmailSyncJobs) {
      await client.query('insert into radar_gmail_sync_jobs (id, connection_id, user_id, status, dedupe_key, lease_until, next_attempt_at, data) values ($1, $2, $3, $4, $5, $6, $7, $8)', [job.id, job.connectionId, job.userId, job.status, job.dedupeKey, job.leaseUntil ?? null, job.nextAttemptAt ?? null, job]);
    }
    await client.query('delete from radar_gmail_oauth_states');
    for (const state of store.gmailOAuthStates) {
      await client.query('insert into radar_gmail_oauth_states (id, user_id, state_hash, expires_at, consumed_at, data) values ($1, $2, $3, $4, $5, $6)', [state.id, state.userId, state.stateHash, state.expiresAt, state.consumedAt ?? null, state]);
    }

    await client.query('delete from radar_library_works');
    for (const work of store.libraryWorks.values()) {
      await client.query('insert into radar_library_works (id, user_id, data) values ($1, $2, $3)', [work.id, work.userId, work]);
    }
    await client.query('delete from radar_library_files');
    for (const file of store.libraryFiles.values()) {
      await client.query('insert into radar_library_files (id, user_id, data) values ($1, $2, $3)', [file.id, file.userId, file]);
    }
    await client.query('delete from radar_saved_answers');
    for (const answer of store.savedAnswers.values()) {
      await client.query('insert into radar_saved_answers (id, user_id, data) values ($1, $2, $3)', [answer.id, answer.userId, answer]);
    }
    await client.query('delete from radar_opportunity_checklists');
    for (const checklist of store.checklists.values()) {
      await client.query('insert into radar_opportunity_checklists (id, user_id, opportunity_id, data) values ($1, $2, $3, $4)', [checklist.id, checklist.userId, checklist.opportunityId, checklist]);
    }
    await client.query('delete from radar_checklist_items');
    for (const item of store.checklistItems.values()) {
      await client.query('insert into radar_checklist_items (id, checklist_id, data) values ($1, $2, $3)', [item.id, item.checklistId, item]);
    }
    await client.query('delete from radar_custom_lists');
    for (const list of store.customLists.values()) {
      await client.query('insert into radar_custom_lists (id, user_id, data) values ($1, $2, $3)', [list.id, list.userId, list]);
    }
    await client.query('delete from radar_custom_list_memberships');
    for (const membership of store.customListMemberships.values()) {
      await client.query('insert into radar_custom_list_memberships (user_id, list_id, opportunity_id, data) values ($1, $2, $3, $4)', [membership.userId, membership.listId, membership.opportunityId, membership]);
    }

    await client.query('delete from radar_alerts');
    for (const a of store.alerts.values()) {
      await client.query('insert into radar_alerts (id, data) values ($1, $2)', [a.id, a]);
    }

    await client.query('delete from radar_emitted_alert_keys');
    for (const key of store.emittedAlertKeys) {
      await client.query('insert into radar_emitted_alert_keys (key) values ($1)', [key]);
    }

    for (const a of store.accounts.values()) {
      await client.query(
        `insert into radar_accounts (id, email, data) values ($1, $2, $3)
         on conflict (id) do update set email = excluded.email, data = excluded.data`,
        [a.id, a.email, a],
      );
    }
    await writeAccountTaxonomyPreferences(client, store);
    await writeOpportunityPreferences(client, store);

    for (const m of store.memberships) {
      if (membershipsHaveRole) {
        await client.query(
          `insert into radar_memberships (account_id, organization_id, role, data) values ($1, $2, $3, $4)
           on conflict (account_id, organization_id) do update set role = excluded.role, data = excluded.data`,
          [m.accountId, m.organizationId, m.role, m],
        );
      } else {
        await client.query(
          `insert into radar_memberships (account_id, organization_id, data) values ($1, $2, $3)
           on conflict (account_id, organization_id) do update set data = excluded.data`,
          [m.accountId, m.organizationId, m],
        );
      }
    }

    // The additive Opportunities schema is deployed separately from the
    // legacy snapshot schema. Older/local databases can still persist Radar
    // without it; production dual-writes once the relational table exists.
    if (await hasTable(client, 'opportunities')) {
      await saveOpportunityProjectionToPostgres(store, client);
    }

    await client.query('delete from radar_audit_log');
    for (const entry of store.auditLog) {
      await client.query('insert into radar_audit_log (id, at, data) values ($1, $2, $3)', [entry.id, entry.at, entry]);
    }

    const nextVersion = currentVersion + 1;
    await client.query(
      'insert into missa_snapshot_versions (domain, version, updated_at) values ($1, $2, now()) on conflict (domain) do update set version = excluded.version, updated_at = excluded.updated_at',
      [RADAR_SNAPSHOT_DOMAIN, nextVersion],
    );
    await client.query('commit');
    return nextVersion;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function readSnapshotVersion(pool: Pool): Promise<number> {
  const result = await pool.query<{ version: string }>(
    'select version from missa_snapshot_versions where domain = $1',
    [RADAR_SNAPSHOT_DOMAIN],
  );
  return Number(result.rows[0]?.version ?? 0);
}

interface KeyedRow<T> { key: string; value: T }
interface RowDelta<T> { upserts: Array<KeyedRow<T>>; deletes: string[] }

function rowDelta<T>(before: T[], after: T[], keyOf: (value: T) => string): RowDelta<T> {
  const beforeRows = new Map(before.map((value) => [keyOf(value), value]));
  const afterRows = new Map(after.map((value) => [keyOf(value), value]));
  const upserts: Array<KeyedRow<T>> = [];
  for (const [key, value] of afterRows) {
    const previous = beforeRows.get(key);
    if (previous === undefined || JSON.stringify(previous) !== JSON.stringify(value)) upserts.push({ key, value });
  }
  return { upserts, deletes: [...beforeRows.keys()].filter((key) => !afterRows.has(key)) };
}

function mapRowDelta<T extends { id: string }>(before: Map<string, T>, after: Map<string, T>): RowDelta<T> {
  return rowDelta([...before.values()], [...after.values()], (value) => value.id);
}

/** Applies only changed Radar rows and rebases the write against the current
 * snapshot version. Canonical opportunity projections are dual-written when
 * an opportunity/source/version/change row changes. */
export async function saveRadarStoreDeltaToPostgres(
  current: RadarStore,
  previous: RadarStore,
  pool: Pool,
  expectedVersion?: number,
): Promise<number> {
  const maps = {
    sources: mapRowDelta(previous.sources, current.sources),
    snapshots: mapRowDelta(previous.snapshots, current.snapshots),
    opportunities: mapRowDelta(previous.opportunities, current.opportunities),
    versions: mapRowDelta(previous.versions, current.versions),
    changes: mapRowDelta(previous.changes, current.changes),
    organizations: mapRowDelta(previous.organizations, current.organizations),
    claims: mapRowDelta(previous.claims, current.claims),
    verificationTasks: mapRowDelta(previous.verificationTasks, current.verificationTasks),
    radarProfiles: mapRowDelta(previous.radarProfiles, current.radarProfiles),
    users: mapRowDelta(previous.users, current.users),
    libraryWorks: mapRowDelta(previous.libraryWorks, current.libraryWorks),
    libraryFiles: mapRowDelta(previous.libraryFiles, current.libraryFiles),
    savedAnswers: mapRowDelta(previous.savedAnswers, current.savedAnswers),
    checklists: mapRowDelta(previous.checklists, current.checklists),
    checklistItems: mapRowDelta(previous.checklistItems, current.checklistItems),
    customLists: mapRowDelta(previous.customLists, current.customLists),
    customListMemberships: rowDelta([...previous.customListMemberships.values()], [...current.customListMemberships.values()], (value) => `${value.userId}:${value.listId}:${value.opportunityId}`),
    alerts: mapRowDelta(previous.alerts, current.alerts),
    accounts: mapRowDelta(previous.accounts, current.accounts),
  };
  const arrays = {
    follows: rowDelta(previous.follows, current.follows, (value) => `${value.userId}:${value.organizationId}`),
    tracked: rowDelta(previous.tracked, current.tracked, (value) => `${value.userId}:${value.opportunityId}`),
    manualTrackerEntries: rowDelta(previous.manualTrackerEntries, current.manualTrackerEntries, (value) => value.id),
    forwardingAddresses: rowDelta(previous.forwardingAddresses, current.forwardingAddresses, (value) => value.id),
    emailCandidates: rowDelta(previous.emailCandidates, current.emailCandidates, (value) => value.id),
    gmailConnections: rowDelta(previous.gmailConnections, current.gmailConnections, (value) => value.id),
    gmailSyncJobs: rowDelta(previous.gmailSyncJobs, current.gmailSyncJobs, (value) => value.id),
    gmailOAuthStates: rowDelta(previous.gmailOAuthStates, current.gmailOAuthStates, (value) => value.id),
    memberships: rowDelta(previous.memberships, current.memberships, (value) => `${value.accountId}:${value.organizationId}`),
  };
  const alertKeys = rowDelta([...previous.emittedAlertKeys], [...current.emittedAlertKeys], (value) => value);
  const auditIds = new Set(previous.auditLog.map((entry) => entry.id));
  const newAuditEntries = current.auditLog.filter((entry) => !auditIds.has(entry.id));
  const hasChangedRows = [...Object.values(maps), ...Object.values(arrays), alertKeys].some((delta) => delta.upserts.length > 0 || delta.deletes.length > 0) || newAuditEntries.length > 0;
  if (!hasChangedRows) return expectedVersion ?? await readSnapshotVersion(pool);

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('missa.radar.snapshot'))");
    const versionRow = await client.query<{ version: string }>('select version from missa_snapshot_versions where domain = $1 for update', [RADAR_SNAPSHOT_DOMAIN]);
    const currentVersion = Number(versionRow.rows[0]?.version ?? 0);
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) throw new SnapshotConflictError(RADAR_SNAPSHOT_DOMAIN, expectedVersion, currentVersion);

    const deleteRows = async (table: string, column: string, ids: string[]) => {
      for (const id of ids) await client.query(`delete from ${table} where ${column} = $1`, [id]);
    };
    await deleteRows('radar_emitted_alert_keys', 'key', alertKeys.deletes);
    await deleteRows('radar_memberships', 'account_id', []);
    for (const key of arrays.memberships.deletes) {
      const [accountId, organizationId] = key.split(':');
      await client.query('delete from radar_memberships where account_id = $1 and organization_id = $2', [accountId, organizationId]);
    }
    for (const key of arrays.follows.deletes) { const [userId, organizationId] = key.split(':'); await client.query('delete from radar_follows where user_id = $1 and organization_id = $2', [userId, organizationId]); }
    for (const key of arrays.tracked.deletes) { const [userId, opportunityId] = key.split(':'); await client.query('delete from radar_tracked where user_id = $1 and opportunity_id = $2', [userId, opportunityId]); }
    await deleteRows('radar_custom_list_memberships', 'user_id', []);
    for (const key of maps.customListMemberships.deletes) { const [userId, listId, opportunityId] = key.split(':'); await client.query('delete from radar_custom_list_memberships where user_id = $1 and list_id = $2 and opportunity_id = $3', [userId, listId, opportunityId]); }
    await deleteRows('radar_email_candidates', 'id', arrays.emailCandidates.deletes);
    await deleteRows('radar_gmail_connections', 'id', arrays.gmailConnections.deletes);
    await deleteRows('radar_gmail_sync_jobs', 'id', arrays.gmailSyncJobs.deletes);
    await deleteRows('radar_gmail_oauth_states', 'id', arrays.gmailOAuthStates.deletes);
    await deleteRows('radar_forwarding_addresses', 'id', arrays.forwardingAddresses.deletes);
    await deleteRows('radar_manual_tracker_entries', 'id', arrays.manualTrackerEntries.deletes);
    await deleteRows('radar_checklist_items', 'id', maps.checklistItems.deletes);
    await deleteRows('radar_opportunity_checklists', 'id', maps.checklists.deletes);
    await deleteRows('radar_alerts', 'id', maps.alerts.deletes);
    await deleteRows('radar_saved_answers', 'id', maps.savedAnswers.deletes);
    await deleteRows('radar_library_files', 'id', maps.libraryFiles.deletes);
    await deleteRows('radar_library_works', 'id', maps.libraryWorks.deletes);
    await deleteRows('radar_accounts', 'id', maps.accounts.deletes);
    await deleteRows('radar_profiles', 'id', maps.radarProfiles.deletes);
    await deleteRows('radar_users', 'id', maps.users.deletes);
    await deleteRows('radar_verification_tasks', 'id', maps.verificationTasks.deletes);
    await deleteRows('radar_claims', 'id', maps.claims.deletes);
    await deleteRows('radar_opportunity_changes', 'id', maps.changes.deletes);
    await deleteRows('radar_opportunity_versions', 'id', maps.versions.deletes);
    await deleteRows('radar_opportunities', 'id', maps.opportunities.deletes);
    await deleteRows('radar_snapshots', 'id', maps.snapshots.deletes);
    await deleteRows('radar_sources', 'id', maps.sources.deletes);
    await deleteRows('radar_organizations', 'id', maps.organizations.deletes);
    await deleteRows('radar_audit_log', 'id', current.auditLog.length ? [] : previous.auditLog.map((entry) => entry.id));

    for (const row of maps.sources.upserts) { const value = row.value; await client.query('insert into radar_sources (id, organization_id, active, data) values ($1, $2, $3, $4) on conflict (id) do update set organization_id = excluded.organization_id, active = excluded.active, data = excluded.data', [value.id, value.organizationId ?? null, value.active, value]); }
    for (const row of maps.snapshots.upserts) { const value = row.value; await client.query('insert into radar_snapshots (id, source_id, data) values ($1, $2, $3) on conflict (id) do update set source_id = excluded.source_id, data = excluded.data', [value.id, value.sourceId, value]); }
    for (const row of maps.opportunities.upserts) { const value = row.value; await client.query('insert into radar_opportunities (id, status, claimed_by_organization_id, data) values ($1, $2, $3, $4) on conflict (id) do update set status = excluded.status, claimed_by_organization_id = excluded.claimed_by_organization_id, data = excluded.data', [value.id, value.status, value.claimedByOrganizationId ?? null, value]); }
    for (const row of maps.versions.upserts) { const value = row.value; await client.query('insert into radar_opportunity_versions (id, opportunity_id, data) values ($1, $2, $3) on conflict (id) do update set opportunity_id = excluded.opportunity_id, data = excluded.data', [value.id, value.opportunityId, value]); }
    for (const row of maps.changes.upserts) { const value = row.value; await client.query('insert into radar_opportunity_changes (id, opportunity_id, data) values ($1, $2, $3) on conflict (id) do update set opportunity_id = excluded.opportunity_id, data = excluded.data', [value.id, value.opportunityId, value]); }
    for (const row of maps.organizations.upserts) { const value = row.value; await client.query('insert into radar_organizations (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [value.id, value]); }
    for (const row of maps.claims.upserts) { const value = row.value; await client.query('insert into radar_claims (id, organization_id, opportunity_id, status, data) values ($1, $2, $3, $4, $5) on conflict (id) do update set organization_id = excluded.organization_id, opportunity_id = excluded.opportunity_id, status = excluded.status, data = excluded.data', [value.id, value.organizationId, value.opportunityId, value.status, value]); }
    for (const row of maps.verificationTasks.upserts) { const value = row.value; await client.query('insert into radar_verification_tasks (id, status, data) values ($1, $2, $3) on conflict (id) do update set status = excluded.status, data = excluded.data', [value.id, value.status, value]); }
    for (const row of maps.radarProfiles.upserts) { const value = row.value; await client.query('insert into radar_profiles (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of maps.users.upserts) { const value = row.value; await client.query('insert into radar_users (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [value.id, value]); }
    for (const row of arrays.follows.upserts) { const value = row.value; await client.query('insert into radar_follows (user_id, organization_id, data) values ($1, $2, $3) on conflict (user_id, organization_id) do update set data = excluded.data', [value.userId, value.organizationId, value]); }
    for (const row of arrays.tracked.upserts) { const value = row.value; await client.query('insert into radar_tracked (user_id, opportunity_id, data) values ($1, $2, $3) on conflict (user_id, opportunity_id) do update set data = excluded.data', [value.userId, value.opportunityId, value]); }
    for (const row of arrays.manualTrackerEntries.upserts) { const value = row.value; await client.query('insert into radar_manual_tracker_entries (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of arrays.forwardingAddresses.upserts) { const value = row.value; await client.query('insert into radar_forwarding_addresses (id, user_id, status, data) values ($1, $2, $3, $4) on conflict (id) do update set user_id = excluded.user_id, status = excluded.status, data = excluded.data', [value.id, value.userId, value.status, value]); }
    for (const row of arrays.emailCandidates.upserts) { const value = row.value; await client.query('insert into radar_email_candidates (id, user_id, forwarding_address_id, provider, provider_message_id, gmail_connection_id, gmail_message_id, state, data) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do update set user_id = excluded.user_id, forwarding_address_id = excluded.forwarding_address_id, provider = excluded.provider, provider_message_id = excluded.provider_message_id, gmail_connection_id = excluded.gmail_connection_id, gmail_message_id = excluded.gmail_message_id, state = excluded.state, data = excluded.data', [value.id, value.userId, value.forwardingAddressId ?? null, value.provider, value.providerMessageId, value.gmailConnectionId ?? null, value.gmailMessageId ?? null, value.state, value]); }
    for (const row of arrays.gmailConnections.upserts) { const value = row.value; await client.query('insert into radar_gmail_connections (id, user_id, google_subject_id, status, data) values ($1, $2, $3, $4, $5) on conflict (id) do update set user_id = excluded.user_id, google_subject_id = excluded.google_subject_id, status = excluded.status, data = excluded.data', [value.id, value.userId, value.googleSubjectId, value.status, value]); }
    for (const row of arrays.gmailSyncJobs.upserts) { const value = row.value; await client.query('insert into radar_gmail_sync_jobs (id, connection_id, user_id, status, dedupe_key, lease_until, next_attempt_at, data) values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do update set connection_id = excluded.connection_id, user_id = excluded.user_id, status = excluded.status, dedupe_key = excluded.dedupe_key, lease_until = excluded.lease_until, next_attempt_at = excluded.next_attempt_at, data = excluded.data', [value.id, value.connectionId, value.userId, value.status, value.dedupeKey, value.leaseUntil ?? null, value.nextAttemptAt ?? null, value]); }
    for (const row of arrays.gmailOAuthStates.upserts) { const value = row.value; await client.query('insert into radar_gmail_oauth_states (id, user_id, state_hash, expires_at, consumed_at, data) values ($1, $2, $3, $4, $5, $6) on conflict (id) do update set user_id = excluded.user_id, state_hash = excluded.state_hash, expires_at = excluded.expires_at, consumed_at = excluded.consumed_at, data = excluded.data', [value.id, value.userId, value.stateHash, value.expiresAt, value.consumedAt ?? null, value]); }
    for (const row of maps.libraryWorks.upserts) { const value = row.value; await client.query('insert into radar_library_works (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of maps.libraryFiles.upserts) { const value = row.value; await client.query('insert into radar_library_files (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of maps.savedAnswers.upserts) { const value = row.value; await client.query('insert into radar_saved_answers (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of maps.checklists.upserts) { const value = row.value; await client.query('insert into radar_opportunity_checklists (id, user_id, opportunity_id, data) values ($1, $2, $3, $4) on conflict (id) do update set user_id = excluded.user_id, opportunity_id = excluded.opportunity_id, data = excluded.data', [value.id, value.userId, value.opportunityId, value]); }
    for (const row of maps.checklistItems.upserts) { const value = row.value; await client.query('insert into radar_checklist_items (id, checklist_id, data) values ($1, $2, $3) on conflict (id) do update set checklist_id = excluded.checklist_id, data = excluded.data', [value.id, value.checklistId, value]); }
    for (const row of maps.customLists.upserts) { const value = row.value; await client.query('insert into radar_custom_lists (id, user_id, data) values ($1, $2, $3) on conflict (id) do update set user_id = excluded.user_id, data = excluded.data', [value.id, value.userId, value]); }
    for (const row of maps.customListMemberships.upserts) { const value = row.value; await client.query('insert into radar_custom_list_memberships (user_id, list_id, opportunity_id, data) values ($1, $2, $3, $4) on conflict (user_id, list_id, opportunity_id) do update set data = excluded.data', [value.userId, value.listId, value.opportunityId, value]); }
    for (const row of maps.alerts.upserts) { const value = row.value; await client.query('insert into radar_alerts (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data', [value.id, value]); }
    for (const key of alertKeys.upserts) await client.query('insert into radar_emitted_alert_keys (key) values ($1) on conflict (key) do nothing', [key.value]);
    for (const row of maps.accounts.upserts) { const value = row.value; await client.query('insert into radar_accounts (id, email, data) values ($1, $2, $3) on conflict (id) do update set email = excluded.email, data = excluded.data', [value.id, value.email, value]); }
    if (maps.users.upserts.length || maps.users.deletes.length || maps.accounts.upserts.length || maps.accounts.deletes.length) {
      await writeAccountTaxonomyPreferences(client, current, maps.accounts.deletes);
      await writeOpportunityPreferences(client, current, maps.accounts.deletes);
    }
    for (const row of arrays.memberships.upserts) { const value = row.value; await client.query('insert into radar_memberships (account_id, organization_id, role, data) values ($1, $2, $3, $4) on conflict (account_id, organization_id) do update set role = excluded.role, data = excluded.data', [value.accountId, value.organizationId, value.role, value]); }
    for (const entry of newAuditEntries) await client.query('insert into radar_audit_log (id, at, data) values ($1, $2, $3) on conflict (id) do nothing', [entry.id, entry.at, entry]);

    if (maps.sources.upserts.length || maps.opportunities.upserts.length || maps.versions.upserts.length || maps.changes.upserts.length) {
      const opportunityIds = new Set<string>([
        ...maps.opportunities.upserts.map((row) => row.key),
        ...maps.versions.upserts.map((row) => row.value.opportunityId),
        ...maps.changes.upserts.map((row) => row.value.opportunityId),
      ]);
      for (const sourceId of maps.sources.upserts.map((row) => row.key)) {
        for (const opportunity of current.opportunities.values()) {
          if (opportunity.sourceId === sourceId) opportunityIds.add(opportunity.id);
        }
      }
      const taxonomySourceIds = new Set(
        maps.sources.upserts
          .filter(({ key, value }) => {
            const previousSource = previous.sources.get(key);
            return !previousSource
              || previousSource.url !== value.url
              || previousSource.registryTier !== value.registryTier
              || previousSource.followsOutboundLinks !== value.followsOutboundLinks
              || JSON.stringify(previousSource.registryTaxonomyTermIds ?? []) !== JSON.stringify(value.registryTaxonomyTermIds ?? [])
              || JSON.stringify(previousSource.registryGeography ?? []) !== JSON.stringify(value.registryGeography ?? [])
              || JSON.stringify(previousSource.registryTrust ?? null) !== JSON.stringify(value.registryTrust ?? null);
          })
          .map(({ key }) => key),
      );
      await saveOpportunityProjectionToPostgres(current, client, {
        opportunityIds,
        sourceIds: new Set(maps.sources.upserts.map((row) => row.key)),
        taxonomySourceIds,
      });
    }
    const nextVersion = currentVersion + 1;
    await client.query('insert into missa_snapshot_versions (domain, version, updated_at) values ($1, $2, now()) on conflict (domain) do update set version = excluded.version, updated_at = excluded.updated_at', [RADAR_SNAPSHOT_DOMAIN, nextVersion]);
    await client.query('commit');
    return nextVersion;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function loadStoreFromPostgres(pool: Pool): Promise<RadarStore> {
  const store = createStore();

  const [
    sources, snapshots, opportunities, versions, changes, organizations, claims, verificationTasks,
    profiles, users, follows, tracked, manualTrackerEntries, forwardingAddresses, emailCandidates, gmailConnections, gmailSyncJobs, gmailOAuthStates, libraryWorks, libraryFiles, savedAnswers, checklists, checklistItems, customLists, customListMemberships, alerts, alertKeys, accounts, memberships, auditLog,
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
    pool.query('select data from radar_manual_tracker_entries'),
    pool.query('select data from radar_forwarding_addresses'),
    pool.query('select data from radar_email_candidates'),
    pool.query('select data from radar_gmail_connections'),
    pool.query('select data from radar_gmail_sync_jobs'),
    pool.query('select data from radar_gmail_oauth_states'),
    pool.query('select data from radar_library_works'),
    pool.query('select data from radar_library_files'),
    pool.query('select data from radar_saved_answers'),
    pool.query('select data from radar_opportunity_checklists'),
    pool.query('select data from radar_checklist_items'),
    pool.query('select data from radar_custom_lists'),
    pool.query('select data from radar_custom_list_memberships'),
    pool.query('select data from radar_alerts'),
    pool.query('select key from radar_emitted_alert_keys'),
    pool.query('select data from radar_accounts'),
    pool.query('select data from radar_memberships'),
    pool.query('select data from radar_audit_log order by at asc'),
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
  store.manualTrackerEntries = manualTrackerEntries.rows.map((r) => r.data);
  store.forwardingAddresses = forwardingAddresses.rows.map((r) => r.data);
  store.emailCandidates = emailCandidates.rows.map((r) => r.data);
  store.gmailConnections = gmailConnections.rows.map((r) => r.data);
  store.gmailSyncJobs = gmailSyncJobs.rows.map((r) => r.data);
  store.gmailOAuthStates = gmailOAuthStates.rows.map((r) => r.data);
  for (const row of libraryWorks.rows) store.libraryWorks.set(row.data.id, row.data);
  for (const row of libraryFiles.rows) store.libraryFiles.set(row.data.id, row.data);
  for (const row of savedAnswers.rows) store.savedAnswers.set(row.data.id, row.data);
  for (const row of checklists.rows) store.checklists.set(row.data.id, row.data);
  for (const row of checklistItems.rows) store.checklistItems.set(row.data.id, row.data);
  for (const row of customLists.rows) store.customLists.set(row.data.id, row.data);
  for (const row of customListMemberships.rows) store.customListMemberships.set(`${row.data.userId}:${row.data.listId}:${row.data.opportunityId}`, row.data);
  for (const row of alerts.rows) store.alerts.set(row.data.id, row.data);
  store.emittedAlertKeys = new Set(alertKeys.rows.map((r) => r.key));
  for (const row of accounts.rows) store.accounts.set(row.data.id, row.data);
  const taxonomyPreferencesTable = await pool.query<{ present: string | null }>("select to_regclass('public.account_taxonomy_preferences') as present");
  if (taxonomyPreferencesTable.rows[0]?.present) {
    const accountById = new Map([...store.accounts.values()].map((account) => [account.id, account] as const));
    const preferences = await pool.query<{ account_id: string; term_id: string; preference: 'include' | 'prefer' | 'exclude'; weight: number }>(
      `select account_id, term_id, preference, weight
         from account_taxonomy_preferences
        where preference in ('include', 'prefer', 'exclude')
        order by account_id, term_id`,
    );
    for (const row of preferences.rows) {
      const userId = accountById.get(row.account_id)?.userId;
      if (!userId) continue;
      const user = store.users.get(userId);
      if (!user) continue;
      user.taxonomyPreferences ??= [];
      if (!user.taxonomyPreferences.some((preference) => preference.termId === row.term_id)) {
        user.taxonomyPreferences.push({ termId: row.term_id, preference: row.preference, weight: row.weight });
      }
    }
  }
  const opportunityPreferencesTable = await pool.query<{ present: string | null }>("select to_regclass('public.opportunity_preferences') as present");
  if (opportunityPreferencesTable.rows[0]?.present) {
    const accountById = new Map([...store.accounts.values()].map((account) => [account.id, account] as const));
    const preferences = await pool.query<{
      account_id: string;
      types: string[];
      disciplines: string[];
      genres: string[];
      locations: string[];
      career_stages: string[];
      max_fee_cents: number | null;
      no_fee_only: boolean;
      deadline_within_days: number | null;
      simultaneous_required: boolean;
    }>(
      `select account_id, types, disciplines, genres, locations, career_stages,
              max_fee_cents, no_fee_only, deadline_within_days, simultaneous_required
         from opportunity_preferences`,
    );
    for (const row of preferences.rows) {
      const userId = accountById.get(row.account_id)?.userId;
      if (!userId) continue;
      const user = store.users.get(userId);
      if (!user) continue;
      // During the compatibility window, preserve an already-loaded snapshot
      // value and use the target row to hydrate older accounts only.
      if (user.opportunityPreferences) continue;
      user.opportunityPreferences = {
        types: (row.types ?? []) as OpportunityType[],
        disciplines: row.disciplines ?? [],
        genres: row.genres ?? [],
        locations: row.locations ?? [],
        careerStages: row.career_stages ?? [],
        ...(row.max_fee_cents === null ? {} : { maxFeeCents: row.max_fee_cents }),
        noFeeOnly: row.no_fee_only,
        ...(row.deadline_within_days === null ? {} : { deadlineWithinDays: row.deadline_within_days }),
        simultaneousRequired: row.simultaneous_required,
      };
    }
  }
  store.memberships = memberships.rows.map((r) => r.data);
  store.auditLog = auditLog.rows.map((r) => r.data);

  return store;
}
