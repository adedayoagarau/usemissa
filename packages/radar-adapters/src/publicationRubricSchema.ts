import type { Pool } from "pg";

/**
 * Additive runtime guard for the publication boundary. The durable migration
 * remains owned by @missa/db; this guard lets Railway workers fail closed while
 * a deployment is warming up.
 */
export const publicationRubricSchema = `
alter table opportunity_source_evidence
  add column if not exists destination_reconciled boolean not null default false;
alter table opportunity_source_evidence
  add column if not exists destination_reconciliation jsonb not null default '{}'::jsonb;
create index if not exists opportunity_source_evidence_destination_idx
  on opportunity_source_evidence (opportunity_id, destination_reconciled, checked_at desc);
`;

export async function ensurePublicationRubricSchema(pool: Pool): Promise<void> {
  await pool.query(publicationRubricSchema);
}
