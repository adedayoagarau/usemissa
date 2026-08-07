import type { Pool } from 'pg';

/** Runtime guard for the content lane. The matching additive migration is
 * owned by @missa/db; this keeps a newly restarted Railway worker from
 * failing before the migrator has warmed the target database. */
export const contentReviewSchema = `
create table if not exists opportunity_contents (
  opportunity_id text primary key,
  input_version text not null,
  builder_version text not null,
  content jsonb not null,
  review_status text not null default 'pending',
  review_score integer not null default 0,
  review_reasons jsonb not null default '[]'::jsonb,
  review_checks jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_contents_opportunity_id_opportunities_id_fk foreign key (opportunity_id) references opportunities(id) on delete cascade,
  check (review_status in ('pending', 'approved', 'needs-human', 'blocked')),
  check (review_score between 0 and 100)
);
create index if not exists opportunity_contents_review_idx on opportunity_contents (review_status, reviewed_at);

create table if not exists radar_content_review_jobs (
  id text primary key,
  opportunity_id text not null unique,
  status text not null default 'queued',
  priority integer not null default 0,
  attempts integer not null default 0,
  input_version text not null,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radar_content_review_jobs_opportunity_id_opportunities_id_fk foreign key (opportunity_id) references opportunities(id) on delete cascade,
  check (status in ('queued', 'building', 'pending-review', 'processing', 'completed', 'failed', 'needs-human', 'blocked')),
  check (attempts >= 0),
  check (priority between -100 and 100)
);
create index if not exists radar_content_review_jobs_ready_idx on radar_content_review_jobs (status, next_attempt_at, lease_until, priority);

create table if not exists radar_content_review_decisions (
  id text primary key,
  job_id text not null,
  opportunity_id text not null,
  run_id text not null,
  reviewer_account_id text,
  decision_source text not null default 'automated',
  decision text not null,
  score integer not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint radar_content_review_decisions_job_id_radar_content_review_jobs_id_fk foreign key (job_id) references radar_content_review_jobs(id) on delete cascade,
  constraint radar_content_review_decisions_opportunity_id_opportunities_id_fk foreign key (opportunity_id) references opportunities(id) on delete cascade,
  constraint radar_content_review_decisions_run_id_radar_agent_runs_id_fk foreign key (run_id) references radar_agent_runs(id) on delete cascade,
  constraint radar_content_review_decisions_reviewer_account_id_radar_accounts_id_fk foreign key (reviewer_account_id) references radar_accounts(id) on delete set null,
  check (decision in ('approved', 'needs-human', 'blocked', 'error')),
  check (decision_source in ('automated', 'human')),
  check (score between 0 and 100)
);
create index if not exists radar_content_review_decisions_opp_created_idx on radar_content_review_decisions (opportunity_id, created_at);
create index if not exists radar_content_review_decisions_run_idx on radar_content_review_decisions (run_id);
alter table radar_content_review_decisions add column if not exists reviewer_account_id text;
alter table radar_content_review_decisions add column if not exists decision_source text not null default 'automated';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'radar_content_review_decisions_source_check') then
    alter table radar_content_review_decisions add constraint radar_content_review_decisions_source_check
      check (decision_source in ('automated', 'human'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'radar_content_review_decisions_reviewer_account_id_radar_accounts_id_fk') then
    alter table radar_content_review_decisions add constraint radar_content_review_decisions_reviewer_account_id_radar_accounts_id_fk
      foreign key (reviewer_account_id) references radar_accounts(id) on delete set null;
  end if;
end $$;
`;

export async function ensureContentReviewSchema(pool: Pool): Promise<void> {
  await pool.query(contentReviewSchema);
}
