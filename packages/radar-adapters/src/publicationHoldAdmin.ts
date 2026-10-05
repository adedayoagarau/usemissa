import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { normalizeOpportunityTitle } from "@missa/radar-engine";
import { ensureOpportunityVersionHead } from "./recommendation/versionHead.js";
import type { ReviewHoldReason } from "./reviewWorker.js";

/**
 * Human terminal for opportunity publication review. The review agent leaves
 * a `reviewable` opportunity with a `needs-human` radar_review_jobs row when it
 * cannot (or, in queue mode, may not) publish on its own. Platform admins
 * resolve those rows here: approval publishes the opportunity, a block
 * suppresses it. Every decision is appended to radar_review_decisions and the
 * audit log in one transaction.
 */

export type PublicationHoldDecision = "approved" | "blocked";

export interface PublicationHoldRow {
  jobId: string;
  opportunityId: string;
  title: string;
  /** The title the editorial pass would publish, recomputed from current data. */
  proposedTitle: string;
  rawTitle: string;
  organizationName?: string;
  sourceName?: string;
  sourceUrl?: string;
  submissionUrl?: string;
  deadlineDate?: string;
  status: string;
  score: number;
  reasons: string[];
  holdReasons: ReviewHoldReason[];
  /** True when every automated gate passed and the record waits only for editorial approval. */
  gatesPassed: boolean;
  /** True when approval needs a title that names the organization. */
  needsTitle: boolean;
  decidedAt?: string;
}

export interface PublicationHoldQueueData {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: {
    total: number;
    heldForEditorialReview: number;
    missingOrganization: number;
    missingOrganizationLink: number;
    possibleNonOpportunity: number;
    otherReview: number;
  };
  rows: PublicationHoldRow[];
}

interface QueueRow extends QueryResultRow {
  job_id: string;
  opportunity_id: string;
  title: string;
  status: string;
  deadline_date: string | null;
  submission_url: string | null;
  source_name: string | null;
  source_url: string | null;
  organization_name: string | null;
  score: number | string | null;
  reasons: unknown;
  checks: unknown;
  decided_at: Date | string | null;
}

interface LockedRow extends QueryResultRow {
  job_id: string;
  opportunity_id: string;
  job_status: string;
  publication_state: string;
  title: string;
  organization_name: string | null;
  run_id: string | null;
  score: number | string | null;
  reasons: unknown;
  checks: unknown;
}

const SOURCE = "radar_review_jobs (needs-human) + radar_review_decisions";
const HOLD_REASONS: ReviewHoldReason[] = ["held-for-editorial-review", "missing-organization", "missing-organization-link", "possible-non-opportunity"];

const ORGANIZATION_NAME_SQL = `coalesce(nullif(btrim(organization.data->>'name'), ''), nullif(btrim(organization_profile.name), ''), linked_profile.name)`;
const ORGANIZATION_JOINS = `
  left join radar_organizations organization on organization.id = o.organization_id
  left join gary_profiles organization_profile on organization_profile.id = o.organization_id
  left join lateral (
    select nullif(btrim(p.name), '') as name
      from opportunity_profile_links link
      join gary_profiles p on p.id = link.profile_id
     where link.opportunity_id = o.id and link.status = 'confirmed' and link.verified_until > now()
     order by link.confidence desc, link.id asc
     limit 1
  ) linked_profile on true`;

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 16) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function holdReasonsFromChecks(checks: unknown): ReviewHoldReason[] {
  return stringList(record(checks).holdReasons).filter((reason): reason is ReviewHoldReason => (HOLD_REASONS as string[]).includes(reason));
}

function gatesPassed(checks: unknown): boolean {
  const gates = record(record(checks).gates);
  const values = Object.values(gates);
  return values.length > 0 && values.every((gate) => gate === "pass");
}

export type PublicationApprovalPlan =
  | { ok: true; title: string; titleChanged: boolean; changes: string[] }
  | { ok: false; reason: string };

/**
 * Decides which title an approval publishes. A reviewer may supply a title;
 * either way it goes through the same deterministic editorial pass, and a
 * title that still cannot identify the opportunity is refused.
 */
export function planPublicationApproval(input: { currentTitle: string; organizationName?: string | null; requestedTitle?: string | null }): PublicationApprovalPlan {
  const requested = input.requestedTitle?.trim();
  if (requested !== undefined && requested.length > 0 && (requested.length < 3 || requested.length > 200)) {
    return { ok: false, reason: "The title must be between 3 and 200 characters." };
  }
  const base = requested && requested.length > 0 ? requested : input.currentTitle;
  const normalized = normalizeOpportunityTitle(base, { organizationName: input.organizationName ?? null });
  if (normalized.title.trim().length === 0) return { ok: false, reason: "The title is empty after editorial cleanup." };
  if (normalized.needsOrganization) {
    return { ok: false, reason: "The title is a bare label and no organization is known. Add the organization to the title before approving." };
  }
  return { ok: true, title: normalized.title, titleChanged: normalized.title !== input.currentTitle, changes: normalized.changes };
}

export function emptyPublicationHoldQueue(generatedAt = new Date().toISOString(), warning?: string): PublicationHoldQueueData {
  return {
    available: false,
    generatedAt,
    source: SOURCE,
    warnings: warning ? [warning] : [],
    summary: { total: 0, heldForEditorialReview: 0, missingOrganization: 0, missingOrganizationLink: 0, possibleNonOpportunity: 0, otherReview: 0 },
    rows: [],
  };
}

async function tablesPresent(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    `select count(*) = 4 as present
       from unnest($1::text[]) as requested(name)
      where to_regclass('public.' || requested.name) is not null`,
    [["radar_review_jobs", "radar_review_decisions", "gary_profiles", "opportunity_profile_links"]],
  );
  return result.rows[0]?.present === true;
}

export function mapPublicationHoldRow(row: QueueRow): PublicationHoldRow {
  const checks = record(row.checks);
  const editorial = record(checks.editorial);
  const holdReasons = holdReasonsFromChecks(checks);
  const proposed = normalizeOpportunityTitle(row.title, { organizationName: row.organization_name });
  const rawTitle = typeof editorial.rawTitle === "string" && editorial.rawTitle.length > 0 ? editorial.rawTitle : row.title;
  const score = Number(row.score);
  return {
    jobId: row.job_id,
    opportunityId: row.opportunity_id,
    title: row.title,
    proposedTitle: proposed.title,
    rawTitle,
    ...(row.organization_name ? { organizationName: row.organization_name } : {}),
    ...(row.source_name ? { sourceName: row.source_name } : {}),
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    ...(row.submission_url ? { submissionUrl: row.submission_url } : {}),
    ...(row.deadline_date ? { deadlineDate: row.deadline_date } : {}),
    status: row.status,
    score: Number.isFinite(score) ? score : 0,
    reasons: stringList(row.reasons),
    holdReasons,
    gatesPassed: gatesPassed(checks),
    needsTitle: proposed.needsOrganization,
    ...(iso(row.decided_at) ? { decidedAt: iso(row.decided_at) } : {}),
  };
}

export async function readPublicationHoldQueue(connectionString: string, limit = 100): Promise<PublicationHoldQueueData> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tablesPresent(pool))) return emptyPublicationHoldQueue(generatedAt, "Opportunity review tables are not deployed yet.");
    const result = await pool.query<QueueRow>(
      `select j.id as job_id, o.id as opportunity_id, o.title, o.status,
              o.deadline_date::text as deadline_date, o.submission_url,
              source.name as source_name, source.url as source_url,
              ${ORGANIZATION_NAME_SQL} as organization_name,
              decision.score, decision.reasons, decision.checks, decision.created_at as decided_at
         from radar_review_jobs j
         join opportunities o on o.id = j.opportunity_id and o.publication_state = 'reviewable'
         left join opportunity_sources source on source.id = o.source_id
         ${ORGANIZATION_JOINS}
         left join lateral (
           select d.score, d.reasons, d.checks, d.created_at
             from radar_review_decisions d
            where d.opportunity_id = j.opportunity_id
            order by d.created_at desc
            limit 1
         ) decision on true
        where j.status = 'needs-human'
        order by coalesce((decision.checks->'holdReasons') ? 'held-for-editorial-review', false) desc,
                 o.deadline_date asc nulls last, j.updated_at asc
        limit $1`,
      [Math.max(1, Math.min(200, Math.floor(limit)))],
    );
    const counts = await pool.query<{ reason: string | null; count: number | string }>(
      `select reason, count(*)::int as count
         from radar_review_jobs j
         join opportunities o on o.id = j.opportunity_id and o.publication_state = 'reviewable'
         left join lateral (
           select d.checks from radar_review_decisions d where d.opportunity_id = j.opportunity_id order by d.created_at desc limit 1
         ) decision on true
         left join lateral (
           select value as reason from jsonb_array_elements_text(coalesce(decision.checks->'holdReasons', '[]'::jsonb))
           union all
           select null where coalesce(jsonb_array_length(decision.checks->'holdReasons'), 0) = 0
         ) reasons on true
        where j.status = 'needs-human'
        group by reason`,
    );
    const totalResult = await pool.query<{ count: number | string }>(
      `select count(*)::int as count
         from radar_review_jobs j
         join opportunities o on o.id = j.opportunity_id and o.publication_state = 'reviewable'
        where j.status = 'needs-human'`,
    );
    const summary = { total: Number(totalResult.rows[0]?.count ?? 0) || 0, heldForEditorialReview: 0, missingOrganization: 0, missingOrganizationLink: 0, possibleNonOpportunity: 0, otherReview: 0 };
    for (const row of counts.rows) {
      const count = Number(row.count) || 0;
      if (row.reason === "held-for-editorial-review") summary.heldForEditorialReview = count;
      else if (row.reason === "missing-organization") summary.missingOrganization = count;
      else if (row.reason === "missing-organization-link") summary.missingOrganizationLink = count;
      else if (row.reason === "possible-non-opportunity") summary.possibleNonOpportunity = count;
      else if (row.reason === null) summary.otherReview = count;
    }
    return { available: true, generatedAt, source: SOURCE, warnings: [], summary, rows: result.rows.map(mapPublicationHoldRow) };
  } finally {
    await pool.end();
  }
}

function namedError(name: "NotFoundError" | "ConflictError", message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function isPublicationGateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "23514" && typeof candidate.message === "string" && candidate.message.includes("Publication gates failed for opportunity");
}

async function lockHold(client: PoolClient, jobId: string): Promise<LockedRow | undefined> {
  const result = await client.query<LockedRow>(
    `select j.id as job_id, j.opportunity_id, j.status as job_status, o.publication_state, o.title,
            ${ORGANIZATION_NAME_SQL} as organization_name,
            decision.run_id, decision.score, decision.reasons, decision.checks
       from radar_review_jobs j
       join opportunities o on o.id = j.opportunity_id
       ${ORGANIZATION_JOINS}
       left join lateral (
         select d.run_id, d.score, d.reasons, d.checks
           from radar_review_decisions d
          where d.opportunity_id = j.opportunity_id
          order by d.created_at desc
          limit 1
       ) decision on true
      where j.id = $1
      for update of j, o`,
    [jobId],
  );
  return result.rows[0];
}

export async function resolvePublicationHold(
  connectionString: string,
  reviewerAccountId: string,
  input: { jobId: string; decision: PublicationHoldDecision; title?: string; note?: string },
): Promise<{ status: "resolved"; jobId: string; opportunityId: string; decision: PublicationHoldDecision; publicationState: "published" | "suppressed"; title: string }> {
  if (!/^[A-Za-z0-9_.:-]{2,200}$/.test(input.jobId)) throw new Error("Invalid publication review job id");
  if (input.decision !== "approved" && input.decision !== "blocked") throw new Error("Invalid publication review decision");
  const note = input.note?.trim().slice(0, 500) ?? "";
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("begin");
    const row = await lockHold(client, input.jobId);
    if (!row) throw namedError("NotFoundError", "Publication review job not found");
    if (row.job_status !== "needs-human") throw namedError("ConflictError", `Publication review job is ${row.job_status}; only needs-human jobs can be resolved`);
    if (row.publication_state !== "reviewable") throw namedError("ConflictError", `The opportunity is ${row.publication_state}; only reviewable opportunities can be resolved`);
    if (!row.run_id) throw new Error("Publication review job is missing its automated review provenance");

    let title = row.title;
    let titleChanges: string[] = [];
    if (input.decision === "approved") {
      const plan = planPublicationApproval({ currentTitle: row.title, organizationName: row.organization_name, requestedTitle: input.title ?? null });
      if (!plan.ok) throw namedError("ConflictError", plan.reason);
      title = plan.title;
      titleChanges = plan.changes;
    }

    const decidedAt = new Date().toISOString();
    const priorReasons = stringList(row.reasons);
    const reason = note || (input.decision === "approved" ? "A platform admin approved publication." : "A platform admin blocked publication.");
    const reasons = [...priorReasons, reason].slice(-16);
    const checks = {
      ...record(row.checks),
      humanReview: {
        decision: input.decision,
        decidedAt,
        reviewerAccountId,
        ...(input.decision === "approved" ? { publishedTitle: title, previousTitle: row.title, titleChanges } : {}),
      },
    };
    const score = Math.max(0, Math.min(100, Math.round(Number(row.score) || 0)));

    await client.query(
      `insert into radar_review_decisions (id, job_id, opportunity_id, run_id, decision, score, reasons, checks)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [randomUUID(), row.job_id, row.opportunity_id, row.run_id, input.decision === "approved" ? "publish" : "suppress", score, JSON.stringify(reasons), JSON.stringify(checks)],
    );
    if (input.decision === "approved") {
      await client.query(
        "update opportunities set title = $2, publication_state = 'published', last_changed_at = now() where id = $1 and publication_state = 'reviewable'",
        [row.opportunity_id, title],
      );
    } else {
      await client.query("update opportunities set publication_state = 'suppressed', last_changed_at = now() where id = $1 and publication_state = 'reviewable'", [row.opportunity_id]);
    }
    await ensureOpportunityVersionHead(client, row.opportunity_id);
    await client.query(
      "update radar_review_jobs set status = $2, lease_until = null, last_error = null, updated_at = now() where id = $1",
      [row.job_id, input.decision === "approved" ? "completed" : "blocked"],
    );
    await client.query(
      `insert into radar_agent_handoffs (id, run_id, opportunity_id, from_agent, to_agent, kind, status, payload, completed_at)
       values ($1, $2, $3, 'human-review', 'publisher', $4, 'completed', $5::jsonb, now())
       on conflict (run_id, opportunity_id, to_agent, kind) do update
         set status = excluded.status, payload = excluded.payload, completed_at = now()`,
      [randomUUID(), row.run_id, row.opportunity_id, input.decision === "approved" ? "publication-human-approved" : "publication-human-blocked", JSON.stringify({ decision: input.decision, reviewerAccountId, title, note: note || undefined })],
    );
    await client.query(
      `insert into audit_events (account_id, action, target_type, target_id, detail)
       values ($1, $2, 'opportunity', $3, $4::jsonb)`,
      [reviewerAccountId, `opportunity.publication.${input.decision}`, row.opportunity_id, JSON.stringify({ jobId: row.job_id, holdReasons: holdReasonsFromChecks(row.checks), previousTitle: row.title, title, note: note || undefined })],
    );
    // Deferred publication-gate constraint triggers run here.
    await client.query("commit");
    return {
      status: "resolved",
      jobId: row.job_id,
      opportunityId: row.opportunity_id,
      decision: input.decision,
      publicationState: input.decision === "approved" ? "published" : "suppressed",
      title,
    };
  } catch (error) {
    await client?.query("rollback").catch(() => undefined);
    if (isPublicationGateError(error)) {
      throw namedError("ConflictError", "The database publication gates still fail for this opportunity. Repair the source, destination, or content evidence before approving.");
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}
