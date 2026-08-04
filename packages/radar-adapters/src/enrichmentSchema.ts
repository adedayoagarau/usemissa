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
  check (kind in ('media', 'winners', 'guidelines')),
  check (status in ('queued', 'processing', 'completed', 'failed', 'blocked')),
  check (attempts >= 0),
  check (priority between -100 and 100)
);
create index if not exists radar_enrichment_jobs_ready_idx
  on radar_enrichment_jobs (status, next_attempt_at, lease_until, priority desc);
create index if not exists radar_enrichment_jobs_opportunity_idx
  on radar_enrichment_jobs (opportunity_id, kind);

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
`;

export async function ensureEnrichmentSchema(pool: Pool): Promise<void> {
  await pool.query(enrichmentSchema);
}
