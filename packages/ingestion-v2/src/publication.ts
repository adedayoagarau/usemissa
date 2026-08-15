import { reviewOpportunityContent, type OpportunityContent } from "@missa/radar-engine";
import type { Pool, PoolClient } from "pg";
import { evaluatePublicationRubric, type PublicationCandidate, type PublicationRubricResult } from "./publicationRubric.js";

/**
 * Ingestion v2 owns the transition from `reviewable` to `published`.
 *
 * Two boundaries hold this safe. It only ever considers opportunities v2 itself
 * wrote, so v2 and the retiring Radar review agent can run side by side without
 * contending for the same records. And it is dry-run unless explicitly enabled,
 * because the failure mode of this code is publishing something wrong, not
 * publishing nothing.
 */

export const publicationDecisionSchema = `
create table if not exists missa_ingestion_v2_publication_decisions (
  id bigserial primary key,
  opportunity_id text not null,
  decision text not null check (decision in ('publish', 'needs-human', 'suppress')),
  applied boolean not null default false,
  score integer not null,
  reasons jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  content_decision text,
  decided_at timestamptz not null default now()
);
create index if not exists missa_ingestion_v2_publication_decisions_opportunity_idx
  on missa_ingestion_v2_publication_decisions(opportunity_id, decided_at desc);
`;

/** v2 writes opportunity ids with this prefix; it is the ownership boundary. */
export const V2_OPPORTUNITY_PREFIX = "opp-v2_";
export const V2_OPPORTUNITY_PREFIXES = ["opp-v2_", "opp_v2_"] as const;

export interface PublicationTickOptions {
  limit?: number;
  /** Without this the tick records what it would do and changes nothing. */
  apply?: boolean;
  logger?: Pick<Console, "info" | "warn">;
}

export interface PublicationTickResult {
  considered: number;
  applied: boolean;
  decisions: Record<"publish" | "needs-human" | "suppress", number>;
  contentReviewed: number;
}

interface CandidateRow {
  opportunity_id: string;
  title: string;
  status: string;
  submission_state: string;
  deadline_date: string | null;
  submission_url: string | null;
  guidelines_url: string | null;
  source_url: string | null;
  processing_succeeded_at: Date | null;
  organization_confirmed: boolean;
  destination_reconciled: boolean;
  content: OpportunityContent | null;
  content_review_status: string | null;
  reading_period_kind: string | null;
}

export async function ensurePublicationSchema(pool: Pool): Promise<void> {
  await pool.query(publicationDecisionSchema);
}

async function candidates(pool: Pool, limit: number): Promise<CandidateRow[]> {
  const result = await pool.query<CandidateRow>(
    `select o.id as opportunity_id, o.title, o.status, o.submission_state,
            o.deadline_date::text as deadline_date, o.submission_url, o.guidelines_url,
            s.url as source_url,
            evidence.processing_succeeded_at,
            coalesce(evidence.organization_confirmed, false) as organization_confirmed,
            coalesce(evidence.destination_reconciled, false) as destination_reconciled,
            content.content, content.review_status as content_review_status,
            profile.reading_period_kind
     from opportunities o
     left join opportunity_sources s on s.id = o.source_id
     left join lateral (
       select processing_succeeded_at, organization_confirmed, destination_reconciled
       from opportunity_source_evidence
       where opportunity_id = o.id order by checked_at desc limit 1
     ) evidence on true
     left join lateral (
       select content, review_status from opportunity_contents
       where opportunity_id = o.id order by updated_at desc limit 1
     ) content on true
     left join opportunity_call_profiles profile on profile.opportunity_id = o.id
     where o.publication_state = 'reviewable' and o.id like any($1::text[])
     order by o.deadline_date asc nulls last, o.id
     limit $2`,
    [V2_OPPORTUNITY_PREFIXES.map((prefix) => `${prefix}%`), Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows;
}

/**
 * Content review checks that every fact traces to a page we actually fetched. It
 * does that by comparing the brief's own `sourceUrl` against one supplied url,
 * so the caller decides which page counts as the citation.
 *
 * Two writers disagree about that. The Radar content builder cites the
 * discovery source; the v2 writer cites the authoritative destination. Picking
 * either one blocks the other writer's briefs wholesale — not because the facts
 * are wrong, but because the two halves were built to different conventions.
 *
 * So the rule is the guarantee itself rather than a preference: a brief may cite
 * any URL this record has evidence for. Anything else is unverifiable and is
 * reviewed against the preferred destination so it fails.
 */
export function contentCitationUrl(
  row: Pick<CandidateRow, "guidelines_url" | "submission_url" | "source_url">,
  contentSourceUrl?: string | null,
): string {
  const preferred = row.guidelines_url ?? row.submission_url ?? row.source_url ?? "";
  if (!contentSourceUrl) return preferred;
  const evidenced = [row.guidelines_url, row.submission_url, row.source_url].filter((url): url is string => Boolean(url));
  return evidenced.includes(contentSourceUrl) ? contentSourceUrl : preferred;
}

/**
 * Content review is computed always and persisted only when applying.
 *
 * This matters while Radar is still running: v2 cites content to the first-party
 * destination where Radar cited it to the discovery source, so v2 approves
 * content Radar had blocked. Writing that status during a dry run would let the
 * Radar review agent publish the record on v2's behalf — a dry run that
 * publishes is not a dry run.
 */
async function reviewContent(client: PoolClient, row: CandidateRow, persist: boolean): Promise<string | null> {
  if (!row.content) return null;
  const result = reviewOpportunityContent(row.content, {
    sourceUrl: contentCitationUrl(row, row.content.sourceUrl),
    ...(row.processing_succeeded_at ? { sourceProcessedAt: new Date(row.processing_succeeded_at).toISOString() } : {}),
    organizationConfirmed: row.organization_confirmed,
    submissionState: row.submission_state,
  });
  const status = result.decision === "approved" ? "approved" : result.decision === "needs-human" ? "needs-human" : "blocked";
  if (!persist) return status;
  await client.query(
    `update opportunity_contents
     set review_status = $2, review_score = $3, review_reasons = $4::jsonb, review_checks = $5::jsonb, reviewed_at = now(), updated_at = now()
     where opportunity_id = $1`,
    [row.opportunity_id, status, result.score, JSON.stringify(result.reasons), JSON.stringify(result.checks)],
  );
  return status;
}

export function candidateFrom(row: CandidateRow, contentStatus: string | null): PublicationCandidate {
  return {
    opportunityId: row.opportunity_id,
    title: row.title ?? "",
    status: row.status,
    submissionState: row.submission_state,
    deadlineDate: row.deadline_date,
    submissionUrl: row.submission_url,
    guidelinesUrl: row.guidelines_url,
    sourceUrl: row.source_url,
    processingSucceededAt: row.processing_succeeded_at ? new Date(row.processing_succeeded_at).toISOString() : null,
    organizationConfirmed: row.organization_confirmed,
    destinationReconciled: row.destination_reconciled,
    contentApproved: (contentStatus ?? row.content_review_status) === "approved",
    readingPeriodKind: row.reading_period_kind,
  };
}

async function recordDecision(client: PoolClient, opportunityId: string, result: PublicationRubricResult, applied: boolean, contentDecision: string | null): Promise<void> {
  await client.query(
    `insert into missa_ingestion_v2_publication_decisions (opportunity_id, decision, applied, score, reasons, checks, content_decision)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [opportunityId, result.decision, applied, result.score, JSON.stringify(result.reasons), JSON.stringify(result.checks), contentDecision],
  );
}

export async function runPublicationTick(pool: Pool, options: PublicationTickOptions = {}): Promise<PublicationTickResult> {
  const logger = options.logger ?? console;
  const apply = options.apply ?? false;
  await ensurePublicationSchema(pool);

  const rows = await candidates(pool, options.limit ?? 50);
  const decisions: PublicationTickResult["decisions"] = { publish: 0, "needs-human": 0, suppress: 0 };
  let contentReviewed = 0;

  for (const row of rows) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const contentStatus = await reviewContent(client, row, apply);
      if (contentStatus) contentReviewed += 1;
      const result = evaluatePublicationRubric(candidateFrom(row, contentStatus));
      decisions[result.decision] += 1;

      // The database trigger is the real gate. If it raises, this record was not
      // ready and the transaction rolls back with the decision unrecorded, so the
      // next tick reconsiders it rather than the row silently drifting.
      let applied = false;
      if (apply && result.decision === "publish") {
        const updated = await client.query(
          "update opportunities set publication_state = 'published', last_changed_at = now() where id = $1 and publication_state = 'reviewable'",
          [row.opportunity_id],
        );
        applied = (updated.rowCount ?? 0) > 0;
      } else if (apply && result.decision === "suppress") {
        const updated = await client.query(
          "update opportunities set publication_state = 'suppressed', last_changed_at = now() where id = $1 and publication_state = 'reviewable'",
          [row.opportunity_id],
        );
        applied = (updated.rowCount ?? 0) > 0;
      }

      await recordDecision(client, row.opportunity_id, result, applied, contentStatus);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      logger.warn(`[missa-ingestion-v2] publication decision failed for ${row.opportunity_id}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.release();
    }
  }

  logger.info(`[missa-ingestion-v2] publication tick: considered=${rows.length} apply=${apply} decisions=${JSON.stringify(decisions)}`);
  return { considered: rows.length, applied: apply, decisions, contentReviewed };
}

/** Publishing changes what the public sees, so it is opt-in and never a default. */
export function publicationApplyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MISSA_INGESTION_V2_PUBLISH === "1";
}
