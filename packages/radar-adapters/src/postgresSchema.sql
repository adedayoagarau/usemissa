-- Missa Radar — Postgres persistence schema.
--
-- Each domain collection is a JSONB document store (id + full record), which
-- matches how the in-memory RadarStore already models them; a handful of
-- columns are pulled out for indexing/filtering. This schema is rewritten in
-- full on every save (see postgresStore.ts) — same semantics as the existing
-- JSON-file store, just durable and queryable.

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
  data jsonb not null,
  primary key (account_id, organization_id)
);
create index if not exists radar_memberships_org_idx on radar_memberships (organization_id);

create table if not exists radar_audit_log (
  id text primary key,
  at timestamptz not null,
  data jsonb not null
);
create index if not exists radar_audit_log_at_idx on radar_audit_log (at);
