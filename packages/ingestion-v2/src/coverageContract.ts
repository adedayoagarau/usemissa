import pg from 'pg';
import {
  evaluateOperationalCoverage,
  WRITING_COVERAGE_SEGMENTS,
  WRITING_COVERAGE_THRESHOLDS,
  type OperationalCoverageAssessment,
} from '@missa/radar-engine';
import { createFirstTrancheSources } from './catalog.js';

const { Pool } = pg;
const REVIEW_SLA_HOURS = 48;

export interface WritingCoverageContractReport {
  generatedAt: string;
  practiceFamily: 'Writing & literature';
  contractVersion: 'writing-coverage.v1';
  provisionalTargets: true;
  sourceSummary: {
    monitored: number;
    healthy: number;
    canonical: number;
    coveredSegments: string[];
    missingSegments: string[];
  };
  inventorySummary: {
    activePublished: number;
    reviewable: number;
    publishedDeadlineKnown: number;
    publishedDestinationAvailable: number;
    publishedOrganizationConfirmed: number;
    reviewSlaBreaches: number;
    activeExpired: number;
    duplicateGroups: number;
  };
  assessment: OperationalCoverageAssessment;
}

interface InventoryRow {
  active_published: number;
  reviewable: number;
  published_deadline_known: number;
  published_destination_available: number;
  published_organization_confirmed: number;
  review_sla_breaches: number;
  active_expired: number;
  duplicate_groups: number;
}

export async function readWritingCoverageContract(connectionString: string, now = new Date()): Promise<WritingCoverageContractReport> {
  const sources = createFirstTrancheSources().filter((source) => source.config.sourceManifest && (source.config.sourceManifest as { desk?: string }).desk === 'writing');
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    const [runResult, inventoryResult] = await Promise.all([
      pool.query<{ source_id: string; status: string; completed_at: Date | string | null }>(
        `select distinct on (source_id) source_id, status, completed_at
           from missa_ingestion_v2_runs
          where source_id = any($1::text[])
          order by source_id, created_at desc`,
        [sources.map((source) => source.id)],
      ),
      pool.query<InventoryRow>(
        `with recursive family(term_id) as (
           select t.id from taxonomy_terms t join taxonomy_facets f on f.id = t.facet_id
            where f.key = 'practice-family' and t.preferred_label = 'Writing & literature' and t.status = 'active'
           union
           select relation.subject_term_id from family join taxonomy_term_relations relation
             on relation.object_term_id = family.term_id and relation.relation_type = 'broader'
         ), scoped as (
           select distinct o.id, o.publication_state, o.status, o.deadline_date, o.deadline_kind,
                  o.submission_state, o.submission_url, o.guidelines_url
             from family join opportunity_taxonomy_terms assignment
               on assignment.term_id = family.term_id and assignment.certainty <> 'rejected'
             join opportunities o on o.id = assignment.opportunity_id
            where o.publication_state in ('published', 'reviewable')
              and o.status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
         ), measured as (
           select scoped.*,
                  coalesce(evidence.organization_confirmed, false) or profile_identity.confirmed as organization_confirmed,
                  coalesce(profile.reading_period_kind <> 'unknown', false) as reading_window_known,
                  job.status as review_job_status, job.updated_at as review_job_updated_at
             from scoped
             left join lateral (
               select organization_confirmed from opportunity_source_evidence
                where opportunity_id = scoped.id order by checked_at desc limit 1
             ) evidence on true
             left join lateral (
               select exists (select 1 from opportunity_profile_links link
                 where link.opportunity_id = scoped.id and link.status = 'confirmed' and link.verified_until > now()) confirmed
             ) profile_identity on true
             left join opportunity_call_profiles profile on profile.opportunity_id = scoped.id
             left join radar_review_jobs job on job.opportunity_id = scoped.id
         ), duplicate_urls as (
           select lower(regexp_replace(split_part(coalesce(submission_url, guidelines_url), '?', 1), '/+$', '')) normalized_url
             from measured where publication_state = 'published' and coalesce(submission_url, guidelines_url) is not null
            group by 1 having count(*) > 1
         )
         select
           count(*) filter (where publication_state = 'published')::int active_published,
           count(*) filter (where publication_state = 'reviewable')::int reviewable,
           count(*) filter (where publication_state = 'published' and (deadline_date is not null or deadline_kind in ('rolling', 'year-round', 'seasonal', 'until-filled') or reading_window_known))::int published_deadline_known,
           count(*) filter (where publication_state = 'published' and submission_state = 'available')::int published_destination_available,
           count(*) filter (where publication_state = 'published' and organization_confirmed)::int published_organization_confirmed,
           count(*) filter (where publication_state = 'reviewable' and review_job_status = 'needs-human' and review_job_updated_at < now() - ($1 || ' hours')::interval)::int review_sla_breaches,
           count(*) filter (where deadline_kind = 'exact' and deadline_date < current_date)::int active_expired,
           (select count(*)::int from duplicate_urls) duplicate_groups
         from measured`,
        [REVIEW_SLA_HOURS],
      ),
    ]);
    const latestRuns = new Map(runResult.rows.map((row) => [row.source_id, row]));
    const healthy = sources.filter((source) => {
      const run = latestRuns.get(source.id);
      if (!run || run.status !== 'completed' || !run.completed_at) return false;
      const completedAt = run.completed_at instanceof Date ? run.completed_at.getTime() : Date.parse(run.completed_at);
      return Number.isFinite(completedAt) && now.getTime() - completedAt <= source.schedule.cadenceHours * 1.5 * 60 * 60_000;
    }).length;
    const canonical = sources.filter((source) => {
      const manifest = source.config.sourceManifest as { role?: string } | undefined;
      return manifest?.role === 'structured-authority' || manifest?.role === 'official-publisher';
    }).length;
    const coveredSegments = [...new Set(sources.flatMap((source) => {
      const manifest = source.config.sourceManifest as { coverageSegments?: string[] } | undefined;
      return manifest?.coverageSegments ?? [];
    }))].sort();
    const inventory = inventoryResult.rows[0] ?? {
      active_published: 0, reviewable: 0, published_deadline_known: 0,
      published_destination_available: 0, published_organization_confirmed: 0,
      review_sla_breaches: 0, active_expired: 0, duplicate_groups: 0,
    };
    const assessment = evaluateOperationalCoverage({
      monitoredSources: sources.length,
      healthySources: healthy,
      canonicalSources: canonical,
      requiredSegments: [...WRITING_COVERAGE_SEGMENTS],
      coveredSegments,
      activePublished: inventory.active_published,
      publishedDeadlineKnown: inventory.published_deadline_known,
      publishedDestinationAvailable: inventory.published_destination_available,
      publishedOrganizationConfirmed: inventory.published_organization_confirmed,
      reviewable: inventory.reviewable,
      reviewSlaBreaches: inventory.review_sla_breaches,
      activeExpired: inventory.active_expired,
      duplicateGroups: inventory.duplicate_groups,
    }, WRITING_COVERAGE_THRESHOLDS);
    return {
      generatedAt: now.toISOString(),
      practiceFamily: 'Writing & literature',
      contractVersion: 'writing-coverage.v1',
      provisionalTargets: true,
      sourceSummary: {
        monitored: sources.length,
        healthy,
        canonical,
        coveredSegments,
        missingSegments: assessment.missingSegments,
      },
      inventorySummary: {
        activePublished: inventory.active_published,
        reviewable: inventory.reviewable,
        publishedDeadlineKnown: inventory.published_deadline_known,
        publishedDestinationAvailable: inventory.published_destination_available,
        publishedOrganizationConfirmed: inventory.published_organization_confirmed,
        reviewSlaBreaches: inventory.review_sla_breaches,
        activeExpired: inventory.active_expired,
        duplicateGroups: inventory.duplicate_groups,
      },
      assessment,
    };
  } finally {
    await pool.end();
  }
}
