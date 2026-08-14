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
create or replace function missa_publication_gate() returns trigger language plpgsql as $$
declare
  source_ok boolean;
  evidence_ok boolean;
  content_ok boolean;
  destination_ok boolean;
  freshness_ok boolean;
begin
  if new.publication_state <> 'published' then return new; end if;
  select coalesce(s.url <> '', false) into source_ok
    from opportunity_sources s where s.id = new.source_id;
  select coalesce(e.processing_succeeded_at is not null and e.organization_confirmed and e.destination_reconciled, false)
    into evidence_ok from opportunity_source_evidence e
    where e.opportunity_id = new.id order by e.checked_at desc limit 1;
  select coalesce(c.review_status = 'approved', false) into content_ok
    from opportunity_contents c where c.opportunity_id = new.id order by c.updated_at desc limit 1;
  destination_ok := new.submission_url is not null or new.guidelines_url is not null;
  freshness_ok := new.status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
    and (new.deadline_date is not null or exists (
      select 1 from opportunity_call_profiles p
      where p.opportunity_id = new.id and p.reading_period_kind <> 'unknown'
    ));
  if not coalesce(source_ok, false) or not coalesce(evidence_ok, false) or not coalesce(content_ok, false)
     or not destination_ok or not freshness_ok or new.submission_state = 'unsafe' then
    raise exception 'Publication gates failed for opportunity %', new.id using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists missa_publication_gate_trigger on opportunities;
create constraint trigger missa_publication_gate_trigger
  after insert or update of publication_state, source_id, status, deadline_date, submission_url, guidelines_url, submission_state
  on opportunities deferrable initially deferred for each row execute function missa_publication_gate();
`;

export async function ensurePublicationRubricSchema(pool: Pool): Promise<void> {
  await pool.query(publicationRubricSchema);
}
