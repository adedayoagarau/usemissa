import type { PoolClient } from 'pg';
import type {
  Opportunity,
  OpportunityStatus,
  RadarStore,
  Source,
} from '@missa/radar-engine';

type PublicationState = 'published' | 'reviewable' | 'suppressed';

function slugFor(opportunity: Opportunity): string {
  const title = opportunity.fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return `${title || 'opportunity'}-${opportunity.id}`;
}

function statusFor(status: OpportunityStatus): { status: string; publicationState: PublicationState } {
  switch (status) {
    case 'opening-soon':
    case 'open':
    case 'closing-soon':
    case 'deadline-extended':
    case 'closed':
    case 'archived':
      return { status, publicationState: 'published' };
    case 'duplicate':
      return { status: 'archived', publicationState: 'suppressed' };
    case 'discovered':
    case 'needs-verification':
    case 'uncertain':
      return { status: 'opening-soon', publicationState: 'reviewable' };
  }
}

function submissionFor(url: string | undefined): {
  url: string | null;
  host: string | null;
  state: 'available' | 'missing' | 'unsafe';
} {
  if (!url) return { url: null, host: null, state: 'missing' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return { url, host: parsed.host, state: 'unsafe' };
    return { url, host: parsed.host, state: 'available' };
  } catch {
    return { url, host: null, state: 'unsafe' };
  }
}

function searchDocument(opportunity: Opportunity): string {
  return [
    opportunity.fields.title,
    opportunity.fields.organizationName,
    opportunity.fields.type,
    ...opportunity.fields.genres,
    opportunity.fields.location,
    opportunity.fields.prize,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

async function upsertSource(client: PoolClient, source: Source): Promise<void> {
  await client.query(
    `insert into opportunity_sources (
       id, organization_id, name, url, kind, active,
       last_checked_at, last_successful_fetch_at, last_processed_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (id) do update set
       organization_id = excluded.organization_id,
       name = excluded.name,
       url = excluded.url,
       kind = excluded.kind,
       active = excluded.active,
       last_checked_at = excluded.last_checked_at,
       last_successful_fetch_at = excluded.last_successful_fetch_at,
       last_processed_at = excluded.last_processed_at,
       updated_at = now()`,
    [
      source.id,
      source.organizationId ?? null,
      source.name,
      source.url,
      source.kind,
      source.active,
      source.lastCheckedAt ?? null,
      source.lastCheckedAt ?? null,
      source.lastCheckedAt ?? null,
    ],
  );
}

async function upsertOpportunity(client: PoolClient, opportunity: Opportunity, source: Source): Promise<void> {
  const lifecycle = statusFor(opportunity.status);
  const submission = submissionFor(opportunity.fields.submissionUrl);
  const organizationId = opportunity.fields.organizationId ?? source.organizationId ?? null;
  const checkedAt = opportunity.lastCheckedAt || opportunity.createdAt;

  await client.query(
    `insert into opportunities (
       id, slug, title, organization_id, source_id, status, publication_state,
       type, discipline, genres, open_date, deadline_date, deadline_timezone,
       deadline_kind, fee_status, fee_cents, fee_currency, prize, location,
       simultaneous_allowed, guidelines_url, submission_url, submission_host,
       submission_verified_at, submission_state, search_document,
       source_checked_at, processing_succeeded_at, last_changed_at, created_at, updated_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17, $18, $19,
       $20, $21, $22, $23,
       null, $24, $25,
       $26, $27, $28, $29, now()
     )
     on conflict (id) do update set
       slug = excluded.slug,
       title = excluded.title,
       organization_id = excluded.organization_id,
       source_id = excluded.source_id,
       status = excluded.status,
       publication_state = excluded.publication_state,
       type = excluded.type,
       discipline = excluded.discipline,
       genres = excluded.genres,
       open_date = excluded.open_date,
       deadline_date = excluded.deadline_date,
       deadline_timezone = excluded.deadline_timezone,
       deadline_kind = excluded.deadline_kind,
       fee_status = excluded.fee_status,
       fee_cents = excluded.fee_cents,
       fee_currency = excluded.fee_currency,
       prize = excluded.prize,
       location = excluded.location,
       simultaneous_allowed = excluded.simultaneous_allowed,
       guidelines_url = excluded.guidelines_url,
       submission_url = excluded.submission_url,
       submission_host = excluded.submission_host,
       submission_state = excluded.submission_state,
       search_document = excluded.search_document,
       source_checked_at = excluded.source_checked_at,
       processing_succeeded_at = excluded.processing_succeeded_at,
       last_changed_at = excluded.last_changed_at,
       updated_at = now()`,
    [
      opportunity.id,
      slugFor(opportunity),
      opportunity.fields.title,
      organizationId,
      source.id,
      lifecycle.status,
      lifecycle.publicationState,
      opportunity.fields.type,
      null,
      opportunity.fields.genres,
      opportunity.fields.openDate ?? null,
      opportunity.fields.deadline.date ?? null,
      null,
      opportunity.fields.deadline.kind,
      !opportunity.fields.fee.disclosed
        ? 'unknown'
        : opportunity.fields.fee.amountCents === 0
          ? 'no-fee'
          : 'paid',
      opportunity.fields.fee.amountCents ?? null,
      opportunity.fields.fee.currency ?? null,
      opportunity.fields.prize ?? null,
      opportunity.fields.location ?? null,
      opportunity.fields.simultaneousAllowed ?? null,
      opportunity.fields.guidelinesUrl ?? null,
      submission.url,
      submission.host,
      submission.state,
      searchDocument(opportunity),
      checkedAt,
      checkedAt,
      opportunity.lastChangedAt,
      opportunity.createdAt,
    ],
  );

  await client.query('delete from opportunity_eligibility_rules where opportunity_id = $1', [opportunity.id]);
  for (const [index, rule] of opportunity.fields.eligibility.entries()) {
    await client.query(
      `insert into opportunity_eligibility_rules
         (id, opportunity_id, rule_key, description, value, certainty, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [`${opportunity.id}:eligibility:${index}`, opportunity.id, rule.key, rule.description, rule.value ?? null, opportunity.claimedByOrganizationId ? 'confirmed' : 'inferred', index],
    );
  }

  await client.query('delete from opportunity_required_materials where opportunity_id = $1', [opportunity.id]);
  for (const [index, material] of opportunity.fields.requiredMaterials.entries()) {
    await client.query(
      `insert into opportunity_required_materials (id, opportunity_id, label, required, sort_order)
       values ($1, $2, $3, true, $4)`,
      [`${opportunity.id}:material:${index}`, opportunity.id, material, index],
    );
  }

  await client.query('delete from opportunity_source_evidence where opportunity_id = $1', [opportunity.id]);
  await client.query(
    `insert into opportunity_source_evidence
       (id, opportunity_id, source_id, kind, name, url, checked_at,
        processing_succeeded_at, organization_confirmed, verified_until)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null)`,
    [
      `${opportunity.id}:evidence:${source.id}`,
      opportunity.id,
      source.id,
      source.kind,
      source.name,
      source.url,
      checkedAt,
      checkedAt,
      Boolean(opportunity.claimedByOrganizationId),
    ],
  );
}

async function upsertVersionsAndChanges(client: PoolClient, store: RadarStore): Promise<void> {
  for (const version of store.versions.values()) {
    await client.query(
      `insert into opportunity_versions (id, opportunity_id, source_snapshot_id, fields, created_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set fields = excluded.fields, created_at = excluded.created_at`,
      [version.id, version.opportunityId, version.snapshotId ?? null, version.fields, version.createdAt],
    );
  }
  for (const change of store.changes.values()) {
    await client.query(
      `insert into opportunity_changes
         (id, opportunity_id, kind, field, old_value, new_value, source_snapshot_id, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         kind = excluded.kind, field = excluded.field, old_value = excluded.old_value,
         new_value = excluded.new_value, source_snapshot_id = excluded.source_snapshot_id,
         created_at = excluded.created_at`,
      [change.id, change.opportunityId, change.kind, change.field, change.oldValue ?? null, change.newValue ?? null, change.snapshotId ?? null, change.at],
    );
  }
}

/**
 * Dual-writes the canonical Radar snapshot into the relational Opportunities
 * projection. The compatibility store remains the source for Radar tick
 * semantics; this projection is the query source for Passport browse/detail.
 */
export async function saveOpportunityProjectionToPostgres(store: RadarStore, client: PoolClient): Promise<void> {
  const referencedSourceIds = new Set<string>();
  for (const opportunity of store.opportunities.values()) referencedSourceIds.add(opportunity.sourceId);
  // Registry sources without an extracted opportunity are not queryable yet;
  // defer them until their first opportunity to keep each cron persistence
  // pass bounded instead of rewriting the full 1,024-source registry.
  for (const sourceId of referencedSourceIds) {
    const source = store.sources.get(sourceId);
    if (source) await upsertSource(client, source);
  }
  for (const opportunity of store.opportunities.values()) {
    const source = store.sources.get(opportunity.sourceId);
    if (source) await upsertOpportunity(client, opportunity, source);
  }
  await upsertVersionsAndChanges(client, store);
}
