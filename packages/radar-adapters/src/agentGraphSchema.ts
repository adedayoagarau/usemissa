import type { Pool } from "pg";

/** Runtime guard for Railway/Vercel cold starts. @missa/db owns the matching
 * generated migration; this keeps a fresh worker from failing closed when it
 * starts against a branch that has not yet been warmed by the migrator. */
export const agentGraphSchema = `
create table if not exists radar_agent_runs (
  id text primary key,
  agent_kind text not null,
  status text not null default 'running',
  correlation_id text,
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  cancelled_at timestamptz,
  control_request_id text,
  replay_of_run_id text,
  input_count integer not null default 0,
  output_count integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled'))
);
alter table radar_agent_runs add column if not exists heartbeat_at timestamptz;
alter table radar_agent_runs add column if not exists paused_at timestamptz;
alter table radar_agent_runs add column if not exists cancelled_at timestamptz;
alter table radar_agent_runs add column if not exists control_request_id text;
alter table radar_agent_runs add column if not exists replay_of_run_id text;
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.radar_agent_runs'::regclass
       and conname = 'radar_agent_runs_status_check'
       and position('paused' in lower(pg_get_constraintdef(oid))) = 0
  ) then
    alter table radar_agent_runs drop constraint radar_agent_runs_status_check;
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.radar_agent_runs'::regclass
       and conname = 'radar_agent_runs_status_check'
  ) then
    alter table radar_agent_runs add constraint radar_agent_runs_status_check
      check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled'));
  end if;
end $$;
create index if not exists radar_agent_runs_kind_started_idx on radar_agent_runs (agent_kind, started_at);
create index if not exists radar_agent_runs_heartbeat_idx on radar_agent_runs (heartbeat_at);
create index if not exists radar_agent_runs_lifecycle_idx on radar_agent_runs (status, heartbeat_at, started_at);
create index if not exists radar_agent_runs_control_idx on radar_agent_runs (control_request_id);

create table if not exists radar_agent_handoffs (
  id text primary key,
  run_id text not null references radar_agent_runs(id) on delete cascade,
  opportunity_id text references opportunities(id) on delete cascade,
  from_agent text not null,
  to_agent text not null,
  kind text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (run_id, opportunity_id, to_agent, kind),
  check (status in ('queued', 'processing', 'completed', 'failed', 'blocked'))
);
create index if not exists radar_agent_handoffs_queue_idx on radar_agent_handoffs (to_agent, status, created_at);

create table if not exists radar_review_jobs (
  id text primary key,
  opportunity_id text not null unique references opportunities(id) on delete cascade,
  status text not null default 'queued',
  priority integer not null default 0,
  attempts integer not null default 0,
  input_version text not null,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('queued', 'processing', 'completed', 'failed', 'needs-human', 'blocked')),
  check (attempts >= 0),
  check (priority between -100 and 100)
);
create index if not exists radar_review_jobs_ready_idx on radar_review_jobs (status, next_attempt_at, lease_until, priority desc);

create table if not exists radar_review_decisions (
  id text primary key,
  job_id text not null references radar_review_jobs(id) on delete cascade,
  opportunity_id text not null references opportunities(id) on delete cascade,
  run_id text not null references radar_agent_runs(id) on delete cascade,
  decision text not null,
  score integer not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (decision in ('publish', 'needs-human', 'suppress', 'error')),
  check (score between 0 and 100)
);
create index if not exists radar_review_decisions_opp_created_idx on radar_review_decisions (opportunity_id, created_at);
create index if not exists radar_review_decisions_run_idx on radar_review_decisions (run_id);
`;

export async function ensureAgentGraphSchema(pool: Pool): Promise<void> {
  await pool.query(agentGraphSchema);
}
