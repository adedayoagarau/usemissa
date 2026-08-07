import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { OpportunityContent } from "@missa/radar-engine";

export type HumanContentReviewDecision = "approved" | "blocked";

export interface ContentReviewQueueRow {
  jobId: string;
  opportunityId: string;
  jobStatus: string;
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  title: string;
  organizationName?: string;
  sourceUrl: string;
  sourceProcessedAt?: string;
  organizationConfirmed: boolean;
  content: OpportunityContent;
  reviewScore: number;
  reviewReasons: string[];
  generatedAt: string;
  reviewedAt?: string;
}

export interface ContentReviewQueueData {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: {
    needsHuman: number;
    pending: number;
    approved: number;
    blocked: number;
    failed: number;
  };
  rows: ContentReviewQueueRow[];
}

interface QueueRow extends QueryResultRow {
  job_id: string;
  opportunity_id: string;
  job_status: string;
  attempts: number;
  next_attempt_at: Date | string | null;
  last_error: string | null;
  title: string;
  organization_name: string | null;
  source_url: string;
  source_processed_at: Date | string | null;
  organization_confirmed: boolean;
  content: unknown;
  review_score: number;
  review_reasons: unknown;
  generated_at: Date | string;
  reviewed_at: Date | string | null;
}

interface SummaryRow extends QueryResultRow {
  status: string;
  count: string | number;
}

interface ReviewDecisionRow extends QueryResultRow {
  job_id: string;
  opportunity_id: string;
  job_status: string;
  run_id: string | null;
  source_url: string;
  content: unknown;
  review_score: number;
}

const SOURCE = "radar_content_review_jobs + opportunity_contents";

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 16)
    : [];
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isContentFact(value: unknown, sourceUrl: string): boolean {
  if (!value || typeof value !== "object") return false;
  const fact = value as Record<string, unknown>;
  return typeof fact.label === "string" && typeof fact.value === "string" && fact.sourceUrl === sourceUrl && (fact.certainty === "confirmed" || fact.certainty === "unknown");
}

function contentValue(value: unknown): OpportunityContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<OpportunityContent>;
  const sourceUrl = candidate.sourceUrl;
  const review = candidate.review;
  const highlights = candidate.highlights;
  const preparation = candidate.preparation;
  const unknowns = candidate.unknowns;
  if (
    typeof candidate.builderVersion !== "string" ||
    typeof candidate.summary !== "string" ||
    !Array.isArray(highlights) ||
    !isHttpUrl(sourceUrl) ||
    !highlights.every((fact) => isContentFact(fact, sourceUrl)) ||
    !Array.isArray(preparation) ||
    !preparation.every((item) => typeof item === "string") ||
    !Array.isArray(unknowns) ||
    !unknowns.every((item) => typeof item === "string") ||
    typeof candidate.nextAction !== "string" ||
    typeof candidate.generatedAt !== "string" ||
    !review ||
    typeof review !== "object" ||
    !["pending", "approved", "needs-human", "blocked"].includes(review.status) ||
    !Array.isArray(review.reasons) ||
    !review.reasons.every((reason) => typeof reason === "string") ||
    !review.checks ||
    typeof review.checks !== "object"
  ) return null;
  return candidate as OpportunityContent;
}

export function emptyContentReviewQueue(generatedAt = new Date().toISOString(), warning?: string): ContentReviewQueueData {
  return {
    available: false,
    generatedAt,
    source: SOURCE,
    warnings: warning ? [warning] : [],
    summary: { needsHuman: 0, pending: 0, approved: 0, blocked: 0, failed: 0 },
    rows: [],
  };
}

async function tablesPresent(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    `select count(*) = 3 as present
       from unnest($1::text[]) as requested(name)
      where to_regclass('public.' || requested.name) is not null`,
    [["radar_content_review_jobs", "opportunity_contents", "radar_content_review_decisions"]],
  );
  return result.rows[0]?.present === true;
}

function mapQueueRow(row: QueueRow): ContentReviewQueueRow | null {
  const content = contentValue(row.content);
  if (!content || content.sourceUrl !== row.source_url || !isHttpUrl(row.source_url)) return null;
  return {
    jobId: row.job_id,
    opportunityId: row.opportunity_id,
    jobStatus: row.job_status,
    attempts: numberValue(row.attempts),
    ...(iso(row.next_attempt_at) ? { nextAttemptAt: iso(row.next_attempt_at) } : {}),
    ...(row.last_error ? { lastError: row.last_error } : {}),
    title: row.title,
    ...(row.organization_name ? { organizationName: row.organization_name } : {}),
    sourceUrl: row.source_url,
    ...(iso(row.source_processed_at) ? { sourceProcessedAt: iso(row.source_processed_at) } : {}),
    organizationConfirmed: row.organization_confirmed,
    content,
    reviewScore: numberValue(row.review_score),
    reviewReasons: stringList(row.review_reasons),
    generatedAt: iso(row.generated_at) ?? new Date(0).toISOString(),
    ...(iso(row.reviewed_at) ? { reviewedAt: iso(row.reviewed_at) } : {}),
  };
}

export async function readContentReviewQueue(connectionString: string, limit = 100): Promise<ContentReviewQueueData> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tablesPresent(pool))) return emptyContentReviewQueue(generatedAt, "Opportunity content review tables are not deployed yet.");
    const [summary, rows] = await Promise.all([
      pool.query<SummaryRow>(
        `select j.status, count(*)::int as count
           from radar_content_review_jobs j
          group by j.status`,
      ),
      pool.query<QueueRow>(
        `select j.id as job_id, j.opportunity_id, j.status as job_status, j.attempts,
                j.next_attempt_at, j.last_error, o.title,
                org.data->>'name' as organization_name, source.url as source_url,
                coalesce(evidence.processing_succeeded_at, o.processing_succeeded_at) as source_processed_at,
                coalesce(evidence.organization_confirmed, false) as organization_confirmed,
                c.content, c.review_score, c.review_reasons, c.generated_at, c.reviewed_at
           from radar_content_review_jobs j
           join opportunity_contents c on c.opportunity_id = j.opportunity_id
           join opportunities o on o.id = j.opportunity_id
           join opportunity_sources source on source.id = o.source_id
           left join radar_organizations org on org.id = o.organization_id
           left join lateral (
             select e.processing_succeeded_at, e.organization_confirmed
               from opportunity_source_evidence e
              where e.opportunity_id = o.id
              order by e.checked_at desc
              limit 1
           ) evidence on true
          where j.status = 'needs-human'
          order by j.priority desc, j.created_at asc
          limit $1`,
        [Math.max(1, Math.min(200, Math.floor(limit)))],
      ),
    ]);
    const counts = { needsHuman: 0, pending: 0, approved: 0, blocked: 0, failed: 0 };
    for (const row of summary.rows) {
      const count = numberValue(row.count);
      if (row.status === "needs-human") counts.needsHuman = count;
      else if (row.status === "pending-review" || row.status === "processing") counts.pending += count;
      else if (row.status === "completed") counts.approved = count;
      else if (row.status === "blocked") counts.blocked = count;
      else if (row.status === "failed") counts.failed = count;
    }
    const mapped = rows.rows.map(mapQueueRow);
    const invalid = mapped.filter((row): row is null => row === null).length;
    return {
      available: true,
      generatedAt,
      source: SOURCE,
      warnings: invalid ? [`${invalid} queued content row(s) were omitted because their stored projection is invalid.`] : [],
      summary: counts,
      rows: mapped.filter((row): row is ContentReviewQueueRow => row !== null),
    };
  } finally {
    await pool.end();
  }
}

export async function resolveContentReview(
  connectionString: string,
  reviewerAccountId: string,
  input: { jobId: string; decision: HumanContentReviewDecision; note?: string },
): Promise<{ status: "resolved"; jobId: string; opportunityId: string; decision: HumanContentReviewDecision }> {
  if (!/^[A-Za-z0-9_.:-]{2,200}$/.test(input.jobId)) throw new Error("Invalid content review job id");
  if (input.decision !== "approved" && input.decision !== "blocked") throw new Error("Invalid content review decision");
  const note = input.note?.trim().slice(0, 500) ?? "";
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("begin");
    const result = await client.query<ReviewDecisionRow>(
      `select j.id as job_id, j.opportunity_id, j.status as job_status,
              (select d.run_id from radar_content_review_decisions d
                where d.job_id = j.id order by d.created_at desc limit 1) as run_id,
              source.url as source_url, c.content, c.review_score
         from radar_content_review_jobs j
         join opportunity_contents c on c.opportunity_id = j.opportunity_id
         join opportunities o on o.id = j.opportunity_id
         join opportunity_sources source on source.id = o.source_id
        where j.id = $1
        for update`,
      [input.jobId],
    );
    const row = result.rows[0];
    if (!row) {
      const error = new Error("Content review job not found");
      error.name = "NotFoundError";
      throw error;
    }
    if (row.job_status !== "needs-human") {
      const error = new Error(`Content review job is ${row.job_status}; only needs-human jobs can be resolved`);
      error.name = "ConflictError";
      throw error;
    }
    const content = contentValue(row.content);
    if (!content || content.sourceUrl !== row.source_url || !row.run_id) throw new Error("Content review job is missing its automated provenance");
    const reviewedAt = new Date().toISOString();
    const reason = note || `Human reviewer marked the content ${input.decision}.`;
    const reasons = [...content.review.reasons, reason].slice(-16);
    const checks = {
      ...content.review.checks,
      humanReview: { decision: input.decision, reviewedAt, reviewerAccountId },
    };
    const reviewedContent: OpportunityContent = {
      ...content,
      review: {
        ...content.review,
        status: input.decision,
        reasons,
        checks,
        reviewedAt,
      },
    };
    await client.query(
      `insert into radar_content_review_decisions
         (id, job_id, opportunity_id, run_id, reviewer_account_id, decision_source, decision, score, reasons, checks)
       values ($1, $2, $3, $4, $5, 'human', $6, $7, $8::jsonb, $9::jsonb)`,
      [randomUUID(), row.job_id, row.opportunity_id, row.run_id, reviewerAccountId, input.decision, numberValue(row.review_score), JSON.stringify(reasons), JSON.stringify(checks)],
    );
    await client.query(
      `update opportunity_contents
          set content = $2::jsonb, review_status = $3, review_reasons = $4::jsonb,
              review_checks = $5::jsonb, reviewed_at = now(), updated_at = now()
        where opportunity_id = $1`,
      [row.opportunity_id, JSON.stringify(reviewedContent), input.decision, JSON.stringify(reasons), JSON.stringify(checks)],
    );
    await client.query(
      `update radar_content_review_jobs
          set status = $2, lease_until = null, last_error = null, updated_at = now()
        where id = $1`,
      [row.job_id, input.decision === "approved" ? "completed" : "blocked"],
    );
    await client.query(
      `insert into radar_agent_handoffs
         (id, run_id, opportunity_id, from_agent, to_agent, kind, status, payload, completed_at)
       values ($1, $2, $3, 'human-review', 'publisher', $4, 'completed', $5::jsonb, now())
       on conflict (run_id, opportunity_id, to_agent, kind) do update
         set status = excluded.status, payload = excluded.payload, completed_at = now()`,
      [randomUUID(), row.run_id, row.opportunity_id, `content-human-${input.decision}`, JSON.stringify({ decision: input.decision, reviewerAccountId, note: note || undefined })],
    );
    await client.query(
      `insert into audit_events (account_id, action, target_type, target_id, detail)
       values ($1, $2, 'opportunity_content', $3, $4::jsonb)`,
      [reviewerAccountId, `opportunity_content.${input.decision}`, row.opportunity_id, JSON.stringify({ jobId: row.job_id, decisionSource: "human", note: note || undefined })],
    );
    await client.query("commit");
    return { status: "resolved", jobId: row.job_id, opportunityId: row.opportunity_id, decision: input.decision };
  } catch (error) {
    await client?.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}
