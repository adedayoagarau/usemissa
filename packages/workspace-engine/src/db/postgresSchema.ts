/**
 * Workspace domain schema, as a plain string constant (not a separate .sql
 * file read via fs at runtime) -- Vercel's serverless bundling traces JS
 * imports, not files resolved dynamically via import.meta.url, so a
 * physically separate .sql file doesn't reliably survive into the deployed
 * function bundle (same fix as radar-adapters/src/postgresSchema.ts, for
 * the identical reason -- a production ENOENT on this exact file).
 *
 * snake_case table/column names throughout, matching
 * packages/radar-adapters/src/postgresSchema.ts's existing convention.
 * Idempotent (IF NOT EXISTS) -- safe to run on every boot, same contract as
 * the Radar side's ensurePostgresSchema.
 */
export const postgresSchema = `
create table if not exists entities (
  id text primary key,
  organization_id text not null,
  name text not null,
  label text,
  created_at timestamptz not null
);

create table if not exists programs (
  id text primary key,
  entity_id text not null references entities(id),
  name text not null,
  created_at timestamptz not null
);

create table if not exists open_calls (
  id text primary key,
  program_id text not null references programs(id),
  title text not null,
  status text not null,
  radar_opportunity_id text,
  created_at timestamptz not null,
  published_at timestamptz,
  guideline_url text,
  guideline_text text,
  guideline_source_type text,
  guideline_imported_at timestamptz,
  guideline_import_report jsonb
);
alter table open_calls add column if not exists guideline_url text;
alter table open_calls add column if not exists guideline_text text;
alter table open_calls add column if not exists guideline_source_type text;
alter table open_calls add column if not exists guideline_imported_at timestamptz;
alter table open_calls add column if not exists guideline_import_report jsonb;

create table if not exists submission_paths (
  id text primary key,
  open_call_id text not null references open_calls(id),
  categories jsonb not null,
  fields jsonb not null,
  fee_cents integer,
  created_at timestamptz not null
);

create table if not exists submissions (
  id text primary key,
  submission_path_id text not null references submission_paths(id),
  submitter_account_id text not null,
  status text not null,
  submitted_at timestamptz not null
  ,payment_status text not null default 'not-required'
  ,payment_session_id text
  ,fee_cents integer
  ,idempotency_key text
  ,answers jsonb
  ,category text
);
alter table submissions add column if not exists payment_status text not null default 'not-required';
alter table submissions add column if not exists payment_session_id text;
alter table submissions add column if not exists fee_cents integer;
alter table submissions add column if not exists idempotency_key text;
alter table submissions add column if not exists answers jsonb;
alter table submissions add column if not exists category text;
create unique index if not exists submissions_submitter_path_idempotency_idx on submissions (submitter_account_id, submission_path_id, idempotency_key) where idempotency_key is not null;

create table if not exists works (
  id text primary key,
  submission_id text not null references submissions(id),
  title text not null,
  file_url text,
  file_urls jsonb,
  "order" integer not null
);
alter table works add column if not exists file_urls jsonb;

create table if not exists submission_drafts (
  id text primary key,
  submission_path_id text not null references submission_paths(id),
  submitter_account_id text not null,
  answers jsonb not null,
  category text,
  work_titles jsonb not null,
  idempotency_key text,
  payment_session_id text,
  updated_at timestamptz not null,
  expires_at timestamptz not null
);
create unique index if not exists submission_drafts_owner_path_idx on submission_drafts (submitter_account_id, submission_path_id);
alter table submission_drafts add column if not exists payment_session_id text;

create table if not exists decisions (
  id text primary key,
  work_id text not null unique references works(id),
  outcome text not null,
  decided_by_account_id text not null,
  decided_at timestamptz not null
);

create table if not exists workspace_audit_log (
  id text primary key,
  at timestamptz not null,
  account_id text,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail text
);

create table if not exists delivery_tasks (
  id text primary key,
  work_id text not null unique references works(id),
  status text not null,
  due_date text,
  completed_at timestamptz
);

create table if not exists review_rounds (
  id text primary key,
  open_call_id text not null references open_calls(id),
  name text not null,
  created_at timestamptz not null
);

create table if not exists review_assignments (
  id text primary key,
  review_round_id text not null references review_rounds(id),
  submission_id text not null references submissions(id),
  reviewer_account_id text not null,
  completed_at timestamptz
);

create table if not exists review_recommendations (
  review_assignment_id text primary key references review_assignments(id),
  score integer,
  notes text,
  recorded_at timestamptz not null
);
`;
