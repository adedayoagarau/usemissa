import { createHash } from 'node:crypto';
import { Pool, type QueryResultRow } from 'pg';
import { evaluatePublicationRubric, type PublicationRubricCandidate, type PublicationRubricResult } from './publicationRubric.js';

export type PublicationReviewLane = 'publish-after-human-approval' | 'repair-required' | 'suppress';

export interface PublicationReviewRow {
  opportunityId: string;
  reviewJobId: string;
  inputVersion: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  deadlineDate: string | null;
  lane: PublicationReviewLane;
  score: number;
  reasons: string[];
  checks: Record<string, unknown>;
}

export interface PublicationReviewPreview {
  generatedAt: string;
  practiceFamily: string;
  policyVersion: 'publication-review.v1';
  membershipHash: string;
  summary: Record<PublicationReviewLane, number> & { total: number };
  reasonCounts: Array<{ reason: string; count: number }>;
  rows: PublicationReviewRow[];
}

interface CandidateRow extends QueryResultRow {
  opportunity_id: string;
  review_job_id: string;
  input_version: string;
  title: string;
  status: string;
  submission_state: string;
  deadline_date: string | null;
  deadline_kind: string | null;
  submission_url: string | null;
  guidelines_url: string | null;
  source_name: string;
  source_url: string;
  processing_succeeded_at: string | null;
  organization_confirmed: boolean;
  destination_reconciled: boolean;
  review_only: boolean;
  content_approved: boolean;
  reading_period_kind: string | null;
  evidence_count: number | string;
}

function candidateFromRow(row: CandidateRow): PublicationRubricCandidate {
  return {
    title: row.title,
    status: row.status,
    submissionState: row.submission_state,
    deadlineDate: row.deadline_date,
    deadlineKind: row.deadline_kind,
    submissionUrl: row.submission_url,
    guidelinesUrl: row.guidelines_url,
    sourceUrl: row.source_url,
    processingSucceededAt: row.processing_succeeded_at,
    organizationConfirmed: row.organization_confirmed,
    destinationReconciled: row.destination_reconciled,
    reviewOnly: row.review_only,
    contentApproved: row.content_approved,
    readingPeriodKind: row.reading_period_kind,
    evidenceCount: Number(row.evidence_count) || 0,
  };
}

export function classifyPublicationCandidate(candidate: PublicationRubricCandidate): {
  lane: PublicationReviewLane;
  result: PublicationRubricResult;
} {
  const result = evaluatePublicationRubric(candidate);
  if (result.decision === 'suppress') return { lane: 'suppress', result };
  const withoutReviewOnlyHold = evaluatePublicationRubric({ ...candidate, reviewOnly: false });
  return withoutReviewOnlyHold.decision === 'publish'
    ? { lane: 'publish-after-human-approval', result }
    : { lane: 'repair-required', result };
}

export function publicationReviewMembershipHash(rows: Iterable<Pick<PublicationReviewRow, 'opportunityId' | 'reviewJobId' | 'inputVersion' | 'lane'>>): string {
  const membership = [...rows]
    .map((row) => `${row.opportunityId}\u0000${row.reviewJobId}\u0000${row.inputVersion}\u0000${row.lane}`)
    .sort()
    .join('\n');
  return createHash('sha256').update(membership).digest('hex');
}

export async function readPublicationReviewPreview(
  connectionString: string,
  options: { practiceFamily: string; limit?: number },
): Promise<PublicationReviewPreview> {
  const practiceFamily = options.practiceFamily.trim();
  if (!practiceFamily || practiceFamily.length > 160) throw new Error('A valid practice family is required');
  const limit = Math.max(1, Math.min(1_000, Math.floor(options.limit ?? 500)));
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000 });
  try {
    const result = await pool.query<CandidateRow>(
      `with recursive family(term_id) as (
         select t.id
           from taxonomy_terms t
           join taxonomy_facets f on f.id = t.facet_id
          where f.key = 'practice-family' and t.preferred_label = $1 and t.status = 'active'
         union
         select relation.subject_term_id
           from family
           join taxonomy_term_relations relation
             on relation.object_term_id = family.term_id and relation.relation_type = 'broader'
       ), scoped as (
         select distinct o.id
           from family
           join opportunity_taxonomy_terms assignment
             on assignment.term_id = family.term_id and assignment.certainty <> 'rejected'
           join opportunities o on o.id = assignment.opportunity_id
          where o.publication_state = 'reviewable'
            and o.status in ('opening-soon', 'open', 'closing-soon', 'deadline-extended')
       )
       select o.id as opportunity_id, job.id as review_job_id, job.input_version,
              o.title, o.status, o.submission_state, o.deadline_date::text,
              o.deadline_kind, o.submission_url, o.guidelines_url,
              source.name as source_name, source.url as source_url,
              evidence.processing_succeeded_at::text,
              (coalesce(evidence.organization_confirmed, false) or profile_identity.confirmed) as organization_confirmed,
              coalesce(evidence.destination_reconciled, false) as destination_reconciled,
              (coalesce((evidence.destination_reconciliation->>'v2ReviewOnly')::boolean, false)
                or (o.id like 'opp_v2_%' and o.source_id like 'v2_source_%')) as review_only,
              coalesce(content.review_status = 'approved', false) as content_approved,
              profile.reading_period_kind,
              coalesce(enrichment.evidence_count, 0)::int as evidence_count
         from scoped
         join opportunities o on o.id = scoped.id
         join opportunity_sources source on source.id = o.source_id
         join radar_review_jobs job on job.opportunity_id = o.id and job.status = 'needs-human'
         left join lateral (
           select processing_succeeded_at, organization_confirmed, destination_reconciled, destination_reconciliation
             from opportunity_source_evidence
            where opportunity_id = o.id order by checked_at desc limit 1
         ) evidence on true
         left join lateral (
           select review_status from opportunity_contents
            where opportunity_id = o.id order by updated_at desc limit 1
         ) content on true
         left join lateral (
           select exists (
             select 1 from opportunity_profile_links link
              where link.opportunity_id = o.id and link.status = 'confirmed' and link.verified_until > now()
           ) as confirmed
         ) profile_identity on true
         left join opportunity_call_profiles profile on profile.opportunity_id = o.id
         left join lateral (
           select count(*) as evidence_count from radar_opportunity_enrichment_evidence where opportunity_id = o.id
         ) enrichment on true
        order by o.deadline_date asc nulls last, o.title asc, o.id asc
        limit $2`,
      [practiceFamily, limit],
    );
    const rows = result.rows.map((row): PublicationReviewRow => {
      const classified = classifyPublicationCandidate(candidateFromRow(row));
      return {
        opportunityId: row.opportunity_id,
        reviewJobId: row.review_job_id,
        inputVersion: row.input_version,
        title: row.title,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        deadlineDate: row.deadline_date,
        lane: classified.lane,
        score: classified.result.score,
        reasons: classified.result.reasons,
        checks: classified.result.checks,
      };
    });
    const summary: PublicationReviewPreview['summary'] = {
      total: rows.length,
      'publish-after-human-approval': 0,
      'repair-required': 0,
      suppress: 0,
    };
    const reasonMap = new Map<string, number>();
    for (const row of rows) {
      summary[row.lane] += 1;
      for (const reason of row.reasons) reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
    return {
      generatedAt: new Date().toISOString(),
      practiceFamily,
      policyVersion: 'publication-review.v1',
      membershipHash: publicationReviewMembershipHash(rows),
      summary,
      reasonCounts: [...reasonMap].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
      rows,
    };
  } finally {
    await pool.end();
  }
}
