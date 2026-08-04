import type { Pool } from "pg";

/** Additive runtime guard; the authoritative migration lives in @missa/db. */
export const enrichmentSchema = `
create table if not exists radar_enrichment_jobs (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  kind text not null,
  status text not null default 'queued',
  priority integer not null default 0,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, kind),
  check (kind in ('media', 'winners', 'guidelines', 'call-profile')),
  check (status in ('queued', 'processing', 'completed', 'failed', 'blocked')),
  check (attempts >= 0),
  check (priority between -100 and 100)
);
create index if not exists radar_enrichment_jobs_ready_idx
  on radar_enrichment_jobs (status, next_attempt_at, lease_until, priority desc);
create index if not exists radar_enrichment_jobs_opportunity_idx
  on radar_enrichment_jobs (opportunity_id, kind);
alter table radar_enrichment_jobs drop constraint if exists radar_enrichment_jobs_kind_check;
alter table radar_enrichment_jobs add constraint radar_enrichment_jobs_kind_check
  check (kind in ('media', 'winners', 'guidelines', 'call-profile'));

create table if not exists radar_opportunity_enrichment_evidence (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  job_id text not null references radar_enrichment_jobs(id) on delete cascade,
  kind text not null,
  url text not null,
  title text,
  excerpt text,
  media_url text,
  confidence text not null default 'unknown',
  rights_status text not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (opportunity_id, kind, url),
  check (kind in ('media', 'winner', 'guideline', 'organization')),
  check (confidence in ('confirmed', 'probable', 'unknown')),
  check (rights_status in ('unknown', 'review', 'permitted'))
);
create index if not exists radar_enrichment_evidence_opp_idx
  on radar_opportunity_enrichment_evidence (opportunity_id, kind, retrieved_at desc);
create index if not exists radar_enrichment_evidence_media_idx
  on radar_opportunity_enrichment_evidence (kind, media_url)
  where media_url is not null;

create table if not exists opportunity_call_profiles (
  opportunity_id text primary key references opportunities(id) on delete cascade,
  call_kind text not null default 'unknown',
  market_kind text not null default 'unknown',
  publication_formats text[] not null default '{}'::text[],
  accepted_formats text[] not null default '{}'::text[],
  subgenres text[] not null default '{}'::text[],
  reading_period_kind text not null default 'unknown',
  reading_period_label text,
  issue_theme text,
  payment_type text,
  payment_amount_cents integer,
  payment_currency text,
  reprints_allowed boolean,
  previously_unpublished_required boolean,
  multiple_submissions_allowed boolean,
  word_limit_min integer,
  word_limit_max integer,
  page_limit_min integer,
  page_limit_max integer,
  response_time_days integer,
  acceptance_rate integer,
  stats_sample_size integer,
  judge_name text,
  prize_summary text,
  eligibility_summary text,
  rights_summary text,
  confidence text not null default 'unknown',
  source_url text not null,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (call_kind in ('general-submission', 'themed-call', 'contest', 'prize', 'fellowship', 'grant', 'residency', 'open-call', 'unknown')),
  check (market_kind in ('magazine', 'journal', 'press', 'anthology', 'contest', 'award', 'organization', 'unknown')),
  check (reading_period_kind in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')),
  check (confidence in ('confirmed', 'probable', 'unknown')),
  check (acceptance_rate is null or acceptance_rate between 0 and 100)
);
create index if not exists opportunity_call_profiles_market_idx on opportunity_call_profiles (market_kind, call_kind);
create index if not exists opportunity_call_profiles_period_idx on opportunity_call_profiles (reading_period_kind, last_verified_at);

create table if not exists opportunity_call_prizes (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  rank integer,
  title text,
  amount_cents integer,
  currency text,
  description text,
  judge_name text,
  source_url text not null,
  confidence text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (confidence in ('confirmed', 'probable', 'unknown')),
  check (amount_cents is null or amount_cents >= 0)
);
create index if not exists opportunity_call_prizes_opp_idx on opportunity_call_prizes (opportunity_id, rank);

create table if not exists opportunity_call_windows (
  id text primary key,
  opportunity_id text not null references opportunities(id) on delete cascade,
  label text,
  opens_at date,
  closes_at date,
  kind text not null default 'unknown',
  timezone text,
  current boolean not null default false,
  source_url text not null,
  confidence text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind in ('exact', 'rolling', 'year-round', 'seasonal', 'unknown')),
  check (confidence in ('confirmed', 'probable', 'unknown'))
);
create index if not exists opportunity_call_windows_opp_idx on opportunity_call_windows (opportunity_id, current, closes_at);
`;

export async function ensureEnrichmentSchema(pool: Pool): Promise<void> {
  await pool.query(enrichmentSchema);
}
