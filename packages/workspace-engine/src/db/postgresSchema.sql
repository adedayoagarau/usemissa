-- Workspace domain schema. snake_case throughout, matching
-- packages/radar-adapters/src/postgresSchema.sql's existing convention.
-- Idempotent (IF NOT EXISTS) -- safe to run on every boot, same contract as
-- the Radar side's ensurePostgresSchema.

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
  published_at timestamptz
);

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
);

create table if not exists works (
  id text primary key,
  submission_id text not null references submissions(id),
  title text not null,
  file_url text,
  "order" integer not null
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
