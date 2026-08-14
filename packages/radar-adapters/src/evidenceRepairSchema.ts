import type { Pool } from "pg";

/** Durable queue for source-first evidence repair. This never publishes directly. */
export const evidenceRepairSchema = `
create table if not exists missa_evidence_repair_jobs (
  id text primary key,
  opportunity_id text not null unique references opportunities(id) on delete cascade,
  status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  last_stage text,
  last_reason text,
  input_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('queued','processing','completed','needs-human','failed','blocked')),
  check (attempts >= 0)
);
create index if not exists missa_evidence_repair_ready_idx
  on missa_evidence_repair_jobs (status, next_attempt_at, lease_until, updated_at);

create table if not exists missa_evidence_repair_attempts (
  id text primary key,
  job_id text not null references missa_evidence_repair_jobs(id) on delete cascade,
  opportunity_id text not null references opportunities(id) on delete cascade,
  run_id text references radar_agent_runs(id) on delete set null,
  stage text not null,
  status text not null,
  source_url text,
  destination_url text,
  facts jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  check (status in ('completed','needs-human','failed','blocked'))
);
create index if not exists missa_evidence_repair_attempts_opp_idx
  on missa_evidence_repair_attempts (opportunity_id, created_at desc);
`;

export async function ensureEvidenceRepairSchema(pool: Pool): Promise<void> {
  await pool.query(evidenceRepairSchema);
}
