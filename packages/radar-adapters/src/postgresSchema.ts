/**
 * Missa Radar — Postgres persistence schema, as a plain string constant
 * (not a separate .sql file read via fs at runtime) -- Vercel's serverless
 * bundling traces JS imports, not files resolved dynamically via
 * import.meta.url, so a physically separate .sql file doesn't reliably
 * survive into the deployed function bundle. This was the actual cause of
 * a production ENOENT ("no such file or directory,
 * .../dist/src/postgresSchema.sql") once ensurePostgresSchema started
 * running on every request instead of only the Cron route.
 *
 * Each domain collection is a JSONB document store (id + full record), which
 * matches how the in-memory RadarStore already models them; a handful of
 * columns are pulled out for indexing/filtering. This schema is rewritten in
 * full on every save (see postgresStore.ts) — same semantics as the existing
 * JSON-file store, just durable and queryable.
 */
export const postgresSchema = `
create table if not exists missa_snapshot_versions (
  domain text primary key,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into missa_snapshot_versions (domain, version)
values ('radar', 0)
on conflict (domain) do nothing;

create table if not exists radar_sources (
  id text primary key,
  organization_id text,
  active boolean not null default true,
  data jsonb not null
);
create index if not exists radar_sources_org_idx on radar_sources (organization_id);

create table if not exists radar_snapshots (
  id text primary key,
  source_id text not null,
  data jsonb not null
);
create index if not exists radar_snapshots_source_idx on radar_snapshots (source_id);

create table if not exists radar_opportunities (
  id text primary key,
  status text not null,
  claimed_by_organization_id text,
  data jsonb not null
);
create index if not exists radar_opportunities_status_idx on radar_opportunities (status);
create index if not exists radar_opportunities_claim_idx on radar_opportunities (claimed_by_organization_id);

create table if not exists radar_opportunity_versions (
  id text primary key,
  opportunity_id text not null,
  data jsonb not null
);
create index if not exists radar_versions_opp_idx on radar_opportunity_versions (opportunity_id);

create table if not exists radar_opportunity_changes (
  id text primary key,
  opportunity_id text not null,
  data jsonb not null
);
create index if not exists radar_changes_opp_idx on radar_opportunity_changes (opportunity_id);

create table if not exists radar_organizations (
  id text primary key,
  data jsonb not null
);

create table if not exists radar_claims (
  id text primary key,
  organization_id text not null,
  opportunity_id text not null,
  status text not null,
  data jsonb not null
);
create index if not exists radar_claims_org_idx on radar_claims (organization_id);

create table if not exists radar_verification_tasks (
  id text primary key,
  status text not null,
  data jsonb not null
);
create index if not exists radar_vtasks_status_idx on radar_verification_tasks (status);

create table if not exists radar_profiles (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create index if not exists radar_profiles_user_idx on radar_profiles (user_id);

create table if not exists radar_users (
  id text primary key,
  data jsonb not null
);

create table if not exists radar_follows (
  user_id text not null,
  organization_id text not null,
  data jsonb not null,
  primary key (user_id, organization_id)
);

create table if not exists radar_tracked (
  user_id text not null,
  opportunity_id text not null,
  data jsonb not null,
  primary key (user_id, opportunity_id)
);

create table if not exists radar_manual_tracker_entries (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create index if not exists radar_manual_tracker_entries_user_idx on radar_manual_tracker_entries (user_id);

create table if not exists radar_forwarding_addresses (
  id text primary key,
  user_id text not null,
  status text not null,
  data jsonb not null
);
create unique index if not exists radar_forwarding_addresses_active_user_idx on radar_forwarding_addresses (user_id) where status <> 'revoked';

create table if not exists radar_email_candidates (
  id text primary key,
  user_id text not null,
  forwarding_address_id text,
  provider text not null,
  provider_message_id text not null,
  gmail_connection_id text,
  gmail_message_id text,
  state text not null,
  data jsonb not null,
  unique (forwarding_address_id, provider, provider_message_id)
);
alter table radar_email_candidates alter column forwarding_address_id drop not null;
create index if not exists radar_email_candidates_user_idx on radar_email_candidates (user_id, state);
alter table radar_email_candidates add column if not exists gmail_connection_id text;
alter table radar_email_candidates add column if not exists gmail_message_id text;
create unique index if not exists radar_email_candidates_gmail_identity_idx on radar_email_candidates (gmail_connection_id, gmail_message_id) where gmail_connection_id is not null and gmail_message_id is not null;

create table if not exists radar_gmail_connections (
  id text primary key,
  user_id text not null,
  google_subject_id text not null,
  status text not null,
  data jsonb not null
);
create unique index if not exists radar_gmail_connections_subject_idx on radar_gmail_connections (google_subject_id);
create index if not exists radar_gmail_connections_status_idx on radar_gmail_connections (status);
create index if not exists radar_gmail_connections_next_sync_idx on radar_gmail_connections ((data->>'nextSyncAt'));

create table if not exists radar_gmail_sync_jobs (
  id text primary key,
  connection_id text not null,
  user_id text not null,
  status text not null,
  dedupe_key text not null,
  lease_until timestamptz,
  next_attempt_at timestamptz,
  data jsonb not null,
  unique (connection_id, dedupe_key)
);
create index if not exists radar_gmail_sync_jobs_ready_idx on radar_gmail_sync_jobs (status, next_attempt_at, lease_until);

create table if not exists radar_gmail_oauth_states (
  id text primary key,
  user_id text not null,
  state_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  data jsonb not null
);
create index if not exists radar_gmail_oauth_states_expiry_idx on radar_gmail_oauth_states (expires_at);

create table if not exists radar_library_works (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create index if not exists radar_library_works_user_idx on radar_library_works (user_id, id);

create table if not exists radar_library_files (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create index if not exists radar_library_files_user_idx on radar_library_files (user_id, id);

create table if not exists radar_saved_answers (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create index if not exists radar_saved_answers_user_idx on radar_saved_answers (user_id, id);

create table if not exists radar_opportunity_checklists (
  id text primary key,
  user_id text not null,
  opportunity_id text not null,
  data jsonb not null
);
create unique index if not exists radar_checklists_user_opportunity_idx on radar_opportunity_checklists (user_id, opportunity_id);

create table if not exists radar_checklist_items (
  id text primary key,
  checklist_id text not null,
  data jsonb not null
);
create index if not exists radar_checklist_items_checklist_idx on radar_checklist_items (checklist_id);

create table if not exists radar_custom_lists (
  id text primary key,
  user_id text not null,
  data jsonb not null
);
create unique index if not exists radar_custom_lists_user_name_idx on radar_custom_lists (user_id, lower(data->>'name'));

create table if not exists radar_custom_list_memberships (
  user_id text not null,
  list_id text not null,
  opportunity_id text not null,
  data jsonb not null,
  primary key (user_id, list_id, opportunity_id)
);
create index if not exists radar_custom_list_memberships_list_idx on radar_custom_list_memberships (user_id, list_id);

create table if not exists radar_alerts (
  id text primary key,
  data jsonb not null
);

create table if not exists radar_emitted_alert_keys (
  key text primary key
);

-- Auth: accounts are login identities (email + salted password hash, inside
-- the jsonb payload like everything else — never a separate plaintext
-- column). Memberships are the scoped-permission edges between an account
-- and an organization. The audit log is append-only.
create table if not exists radar_accounts (
  id text primary key,
  email text not null,
  data jsonb not null
);
create unique index if not exists radar_accounts_email_idx on radar_accounts (email);

create table if not exists radar_memberships (
  account_id text not null,
  organization_id text not null,
  role text not null default 'member',
  data jsonb not null,
  primary key (account_id, organization_id)
);
alter table radar_memberships add column if not exists role text not null default 'member';
create index if not exists radar_memberships_org_idx on radar_memberships (organization_id);

create table if not exists radar_audit_log (
  id text primary key,
  at timestamptz not null,
  data jsonb not null
);
create index if not exists radar_audit_log_at_idx on radar_audit_log (at);
`;
