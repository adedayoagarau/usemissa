import type { PoolClient } from 'pg';
import type {
  Opportunity,
  OpportunityStatus,
  RadarStore,
  Source,
} from '@missa/radar-engine';
import { defaultSourceTrust } from '@missa/radar-engine';

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
    ...(opportunity.fields.taxonomyAssignments ?? []).flatMap((assignment) => assignment.termId ? [assignment.termId] : []),
    opportunity.fields.location,
    opportunity.fields.prize,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

async function upsertSources(client: PoolClient, sources: Source[]): Promise<void> {
  if (sources.length === 0) return;
  const values = sources.flatMap((source) => [
    source.id,
    source.organizationId ?? null,
    source.name,
    source.url,
    source.kind,
    source.active,
    source.registryTier ?? 0,
    source.followsOutboundLinks ?? false,
    source.checkIntervalHours,
    source.firstVerifiedAt ?? null,
    source.nextCheckAt ?? null,
    source.lastCheckedAt ?? null,
    source.lastSuccessfulFetchAt ?? null,
    source.lastProcessedAt ?? null,
  ]);
  const rows = sources.map((_, index) => {
    const offset = index * 14;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`;
  }).join(', ');
  await client.query(
    `insert into opportunity_sources (
       id, organization_id, name, url, kind, active, source_tier,
       follows_outbound_links, check_interval_hours, first_verified_at,
       next_check_at, last_checked_at, last_successful_fetch_at,
       last_processed_at
     ) values ${rows}
     on conflict (id) do update set
       organization_id = excluded.organization_id,
       name = excluded.name,
       url = excluded.url,
       kind = excluded.kind,
       active = excluded.active,
       source_tier = excluded.source_tier,
       follows_outbound_links = excluded.follows_outbound_links,
       check_interval_hours = excluded.check_interval_hours,
       first_verified_at = excluded.first_verified_at,
       next_check_at = excluded.next_check_at,
       last_checked_at = excluded.last_checked_at,
       last_successful_fetch_at = excluded.last_successful_fetch_at,
       last_processed_at = excluded.last_processed_at,
       updated_at = now()`,
    values,
  );

  // Trust columns were added after the original source projection. Keep this
  // second write guarded so older deployments continue to persist sources
  // while the additive migration is rolling out.
  const trustColumns = await client.query<{ present: boolean }>(
    `select count(*) = 6 as present
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'opportunity_sources'
        and column_name = any($1::text[])`,
    [['trust_status', 'trust_score', 'authority_kind', 'trust_evidence_url', 'trust_reviewed_at', 'trust_review_note']],
  );
  if (trustColumns.rows[0]?.present !== true) return;
  const trustRows = sources.map((source) => {
    const trust = source.registryTrust ?? defaultSourceTrust({ tier: source.registryTier ?? 0, kind: source.kind });
    return {
      id: source.id,
      trustStatus: trust.status,
      trustScore: trust.score,
      authorityKind: trust.authorityKind,
      trustEvidenceUrl: trust.evidenceUrl ?? null,
      trustReviewedAt: trust.reviewedAt ?? null,
      trustReviewNote: trust.reviewNote ?? null,
    };
  });
  await client.query(
    `update opportunity_sources as target set
       trust_status = incoming.trust_status,
       trust_score = incoming.trust_score,
       authority_kind = incoming.authority_kind,
       trust_evidence_url = incoming.trust_evidence_url,
       trust_reviewed_at = incoming.trust_reviewed_at,
       trust_review_note = incoming.trust_review_note,
       updated_at = now()
     from jsonb_to_recordset($1::jsonb) as incoming(
       id text,
       trust_status text,
       trust_score integer,
       authority_kind text,
       trust_evidence_url text,
       trust_reviewed_at timestamptz,
       trust_review_note text
     )
     where target.id = incoming.id`,
    [JSON.stringify(trustRows)],
  );
}

async function taxonomyTablesAvailable(client: PoolClient): Promise<boolean> {
  if (process.env.MISSA_TAXONOMY_PERSISTENCE === "0") return false;
  const result = await client.query<{ ready: boolean }>(
    `select to_regclass('public.taxonomy_terms') is not null
      and to_regclass('public.opportunity_taxonomy_terms') is not null
      and to_regclass('public.opportunity_source_taxonomy_terms') is not null as ready`,
  );
  return result.rows[0]?.ready === true;
}

async function upsertSourceTaxonomy(client: PoolClient, source: Source): Promise<void> {
  const termIds = source.registryTaxonomyTermIds ?? [];
  await client.query(
    `update opportunity_sources set
       canonical_url = coalesce(canonical_url, $2),
       normalized_url = coalesce(normalized_url, lower(regexp_replace($2, '/+$', ''))),
       source_tier = coalesce($3, source_tier),
       follows_outbound_links = coalesce($4, follows_outbound_links),
       geography_codes = coalesce($5, geography_codes),
       updated_at = now()
     where id = $1`,
    [source.id, source.url, source.registryTier ?? 0, source.followsOutboundLinks ?? false, source.registryGeography ?? []],
  );
  await client.query(
    `delete from opportunity_source_taxonomy_terms
     where source_id = $1 and assignment_origin in ('registry', 'backfill', 'extractor')`,
    [source.id],
  );
  for (const termId of termIds) {
    await client.query(
      `insert into opportunity_source_taxonomy_terms
         (source_id, term_id, coverage_kind, assignment_origin, source_phrase, confidence, updated_at)
       values ($1, $2, 'accepts', 'registry', $3, 90, now())
       on conflict (source_id, term_id, coverage_kind) do update set
         assignment_origin = case when opportunity_source_taxonomy_terms.assignment_origin = 'reviewer' then opportunity_source_taxonomy_terms.assignment_origin else excluded.assignment_origin end,
         source_phrase = case when opportunity_source_taxonomy_terms.assignment_origin = 'reviewer' then opportunity_source_taxonomy_terms.source_phrase else excluded.source_phrase end,
         confidence = case when opportunity_source_taxonomy_terms.assignment_origin = 'reviewer' then opportunity_source_taxonomy_terms.confidence else excluded.confidence end,
         updated_at = now()`,
      [source.id, termId, source.registryVerticalId ?? null],
    );
  }
}

async function upsertOpportunity(client: PoolClient, opportunity: Opportunity, source: Source, taxonomyEnabled: boolean): Promise<void> {
  const lifecycle = statusFor(opportunity.status);
  const submission = submissionFor(opportunity.fields.submissionUrl);
  const organizationId = opportunity.fields.organizationId ?? source.organizationId ?? null;
  // `lastCheckedAt` is an attempt timestamp. It must not be presented as a
  // successful verification after a failed fetch. The opportunity is only
  // persisted after extraction, so its processing timestamp is the source's
  // successful canonicalization time when available.
  const checkedAt = source.lastCheckedAt ?? opportunity.lastCheckedAt ?? opportunity.createdAt;
  const processedAt = source.lastProcessedAt ?? source.lastSuccessfulFetchAt ?? null;

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
      opportunity.fields.genres[0] ?? source.registryDisciplines?.[0] ?? null,
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
      opportunity.fields.location ?? source.registryGeography?.join(', ') ?? null,
      opportunity.fields.simultaneousAllowed ?? null,
      opportunity.fields.guidelinesUrl ?? null,
      submission.url,
      submission.host,
      submission.state,
      searchDocument(opportunity),
      checkedAt,
      processedAt,
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
      processedAt,
      Boolean(opportunity.claimedByOrganizationId),
    ],
  );

  // Evidence is inserted before taxonomy assignments because the canonical
  // junction preserves its evidence FK. Reviewer/organization assignments are
  // left intact; only extractor-owned rows are replaced on reprocessing.
  if (taxonomyEnabled) {
    const assignments = (opportunity.fields.taxonomyAssignments ?? []).filter((assignment) => assignment.termId);
    await client.query(
      `delete from opportunity_taxonomy_terms
       where opportunity_id = $1 and assignment_origin in ('extractor', 'backfill', 'registry')`,
      [opportunity.id],
    );
    for (const assignment of assignments) {
      await client.query(
        `insert into opportunity_taxonomy_terms
           (opportunity_id, term_id, source_evidence_id, source_snapshot_id,
            source_phrase, normalized_phrase, assignment_origin, certainty, "primary", updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         on conflict (opportunity_id, term_id) do update set
           source_evidence_id = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.source_evidence_id else excluded.source_evidence_id end,
           source_snapshot_id = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.source_snapshot_id else excluded.source_snapshot_id end,
           source_phrase = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.source_phrase else excluded.source_phrase end,
           normalized_phrase = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.normalized_phrase else excluded.normalized_phrase end,
           assignment_origin = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.assignment_origin else excluded.assignment_origin end,
           certainty = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms.certainty else excluded.certainty end,
           "primary" = case when opportunity_taxonomy_terms.assignment_origin in ('organization', 'reviewer') then opportunity_taxonomy_terms."primary" else excluded."primary" end,
           updated_at = now()`,
        [
          opportunity.id,
          assignment.termId,
          `${opportunity.id}:evidence:${source.id}`,
          assignment.snapshotId ?? null,
          assignment.sourcePhrase,
          assignment.normalizedPhrase,
          assignment.assignmentOrigin ?? 'extractor',
          assignment.certainty,
          assignment.facet === 'discipline',
        ],
      );
    }
  }
}

async function upsertVersionsAndChanges(client: PoolClient, store: RadarStore, opportunityIds?: Set<string>): Promise<void> {
  const versions = opportunityIds
    ? [...store.versions.values()].filter((version) => opportunityIds.has(version.opportunityId))
    : [...store.versions.values()];
  const changes = opportunityIds
    ? [...store.changes.values()].filter((change) => opportunityIds.has(change.opportunityId))
    : [...store.changes.values()];
  for (const version of versions) {
    await client.query(
      `insert into opportunity_versions (id, opportunity_id, source_snapshot_id, fields, created_at)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do update set fields = excluded.fields, created_at = excluded.created_at`,
      [version.id, version.opportunityId, version.snapshotId ?? null, version.fields, version.createdAt],
    );
  }
  for (const change of changes) {
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
export async function saveOpportunityProjectionToPostgres(
  store: RadarStore,
  client: PoolClient,
  scope?: { opportunityIds?: Set<string>; sourceIds?: Set<string>; taxonomySourceIds?: Set<string> },
): Promise<void> {
  const referencedSourceIds = new Set<string>();
  const opportunities = scope?.opportunityIds
    ? [...scope.opportunityIds].map((id) => store.opportunities.get(id)).filter((value): value is Opportunity => Boolean(value))
    : [...store.opportunities.values()];
  // Every writer must lock projection rows in the same order. Review and
  // enrichment run concurrently with Radar; deterministic ordering prevents
  // cross-lane deadlocks when two batches touch overlapping opportunities.
  opportunities.sort((a, b) => a.id.localeCompare(b.id));
  for (const opportunity of opportunities) referencedSourceIds.add(opportunity.sourceId);
  for (const sourceId of scope?.sourceIds ?? []) referencedSourceIds.add(sourceId);
  // Registry sources without an extracted opportunity are not queryable yet;
  // defer them until their first opportunity to keep each cron persistence
  // pass bounded instead of rewriting the full 1,024-source registry.
  const referencedSources = [...referencedSourceIds]
    .map((sourceId) => store.sources.get(sourceId))
    .filter((value): value is Source => Boolean(value));
  const taxonomyEnabled = await taxonomyTablesAvailable(client);
  await upsertSources(client, referencedSources);
  if (taxonomyEnabled) {
    const taxonomySourceIds = scope?.taxonomySourceIds;
    for (const source of referencedSources) {
      if (!scope || taxonomySourceIds?.has(source.id)) await upsertSourceTaxonomy(client, source);
    }
  }
  for (const opportunity of opportunities) {
    const source = store.sources.get(opportunity.sourceId);
    if (source) await upsertOpportunity(client, opportunity, source, taxonomyEnabled);
  }
  await upsertVersionsAndChanges(client, store, scope?.opportunityIds);
}
