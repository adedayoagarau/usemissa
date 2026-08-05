import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface TaxonomyAdminDashboard {
  available: boolean;
  generatedAt: string;
  scheme?: { id: string; key: string; version: number; status: string };
  proposals: { open: number; researching: number; approved: number; rejected: number; applied: number };
  coverage: { unassessed: number; gap: number; thin: number; covered: number; strong: number; blocked: number };
  discovery: { queued: number; running: number; failed: number; blocked: number; candidatesAwaitingReview: number };
  assignments: { total: number; byOrigin: Array<{ origin: string; count: number }>; byCertainty: Array<{ certainty: string; count: number }> };
  proposalRows: Array<{ id: string; schemeId: string; termId?: string; kind: string; status: string; proposedByAccountId?: string; evidenceCount: number; decisionNotePresent: boolean; createdAt?: string; reviewedAt?: string }>;
}

export const TAXONOMY_REVIEW_STATUSES = ["approved", "rejected"] as const;
export type TaxonomyReviewStatus = (typeof TAXONOMY_REVIEW_STATUSES)[number];

const emptyDashboard = (): TaxonomyAdminDashboard => ({
  available: false,
  generatedAt: new Date().toISOString(),
  proposals: { open: 0, researching: 0, approved: 0, rejected: 0, applied: 0 },
  coverage: { unassessed: 0, gap: 0, thin: 0, covered: 0, strong: 0, blocked: 0 },
  discovery: { queued: 0, running: 0, failed: 0, blocked: 0, candidatesAwaitingReview: 0 },
  assignments: { total: 0, byOrigin: [], byCertainty: [] },
  proposalRows: [],
});

/** Server-side, read-only governance summary. It fails closed when the additive
 * taxonomy migration is not present; this keeps preview deployments useful
 * without pretending the graph is live. */
export async function readTaxonomyAdminDashboard(connectionString: string): Promise<TaxonomyAdminDashboard> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const tables = await pool.query<{ name: string | null }>(
      `select to_regclass('public.taxonomy_schemes') as name
       union all select to_regclass('public.taxonomy_change_proposals')
       union all select to_regclass('public.source_coverage_cells')
       union all select to_regclass('public.source_discovery_queries')
       union all select to_regclass('public.opportunity_taxonomy_terms')`,
    );
    if (tables.rows.some((row) => !row.name)) return emptyDashboard();

    const [scheme, proposals, coverage, discovery, assignments] = await Promise.all([
      pool.query(`select id, key, version, status from taxonomy_schemes order by updated_at desc limit 1`),
      pool.query(`select
        count(*) filter (where status = 'open')::int as open,
        count(*) filter (where status = 'researching')::int as researching,
        count(*) filter (where status = 'approved')::int as approved,
        count(*) filter (where status = 'rejected')::int as rejected,
        count(*) filter (where status = 'applied')::int as applied
        from taxonomy_change_proposals`),
      pool.query(`select
        count(*) filter (where status = 'unassessed')::int as unassessed,
        count(*) filter (where status = 'gap')::int as gap,
        count(*) filter (where status = 'thin')::int as thin,
        count(*) filter (where status = 'covered')::int as covered,
        count(*) filter (where status = 'strong')::int as strong,
        count(*) filter (where status = 'blocked')::int as blocked
        from source_coverage_cells`),
      pool.query(`select
        count(*) filter (where status = 'queued')::int as queued,
        count(*) filter (where status = 'running')::int as running,
        count(*) filter (where status = 'failed')::int as failed,
        count(*) filter (where status = 'blocked')::int as blocked
        from source_discovery_queries`),
      pool.query(`select
        count(*)::int as total,
        coalesce(jsonb_agg(jsonb_build_object('origin', origin, 'count', count) order by origin) filter (where origin is not null), '[]'::jsonb) as origins,
        coalesce((select jsonb_agg(jsonb_build_object('certainty', certainty, 'count', count) order by certainty)
          from (select certainty, count(*)::int as count from opportunity_taxonomy_terms group by certainty) certainty_counts), '[]'::jsonb) as certainties
        from (select assignment_origin as origin, count(*)::int as count from opportunity_taxonomy_terms group by assignment_origin) origin_counts`),
    ]);
    const [pendingCandidates, proposalRows] = await Promise.all([
      pool.query<{ count: number }>(`select count(*)::int as count from source_discovery_candidates where status in ('discovered', 'queued', 'reviewing')`),
      pool.query<{ id: string; scheme_id: string; term_id?: string | null; kind: string; status: string; proposed_by_account_id?: string | null; evidence_count: number | string; decision_note_present: boolean; created_at: unknown; reviewed_at?: unknown }>(
        `select id, scheme_id, term_id, kind, status, proposed_by_account_id,
                coalesce(cardinality(evidence_urls), 0)::int as evidence_count,
                decision_note is not null as decision_note_present, created_at, reviewed_at
           from taxonomy_change_proposals order by created_at desc limit 100`,
      ),
    ]);
    return {
      available: true,
      generatedAt: new Date().toISOString(),
      scheme: scheme.rows[0],
      proposals: proposals.rows[0],
      coverage: coverage.rows[0],
      discovery: { ...discovery.rows[0], candidatesAwaitingReview: pendingCandidates.rows[0]?.count ?? 0 },
      assignments: {
        total: assignments.rows[0]?.total ?? 0,
        byOrigin: assignments.rows[0]?.origins ?? [],
        byCertainty: assignments.rows[0]?.certainties ?? [],
      },
      proposalRows: proposalRows.rows.map((row) => ({
        id: row.id,
        schemeId: row.scheme_id,
        ...(row.term_id ? { termId: row.term_id } : {}),
        kind: row.kind,
        status: row.status,
        ...(row.proposed_by_account_id ? { proposedByAccountId: row.proposed_by_account_id } : {}),
        evidenceCount: Number(row.evidence_count ?? 0),
        decisionNotePresent: row.decision_note_present === true,
        ...(row.created_at instanceof Date ? { createdAt: row.created_at.toISOString() } : typeof row.created_at === 'string' && row.created_at ? { createdAt: row.created_at } : {}),
        ...(row.reviewed_at instanceof Date ? { reviewedAt: row.reviewed_at.toISOString() } : typeof row.reviewed_at === 'string' && row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
      })),
    };
  } finally {
    await pool.end();
  }
}

const PROPOSAL_KINDS = new Set([
  "add-term", "rename-term", "add-alias", "change-relation", "deprecate-term",
  "restore-term", "merge-terms", "split-term",
]);

export async function createTaxonomyChangeProposal(input: {
  connectionString: string;
  schemeId: string;
  accountId?: string;
  kind: string;
  termId?: string;
  payload: Record<string, unknown>;
  evidenceUrls?: string[];
  idempotencyKey?: string;
}): Promise<{ id: string; status: "open" }> {
  if (!PROPOSAL_KINDS.has(input.kind)) throw new Error("Unsupported taxonomy proposal kind");
  const pool = new Pool({ connectionString: input.connectionString, max: 1 });
  const id = `tcp_${randomUUID()}`;
  const idempotencyKey = input.idempotencyKey?.trim() || id;
  try {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [idempotencyKey]);
      if (input.accountId) {
        const replay = await client.query<{ id: string }>(
          `select target_id as id from audit_events
            where account_id = $1 and action = 'taxonomy.proposal.created'
              and detail->>'idempotencyKey' = $2 order by created_at desc limit 1`,
          [input.accountId, idempotencyKey],
        );
        if (replay.rows[0]) {
          await client.query("commit");
          return { id: replay.rows[0].id, status: "open" };
        }
      }
      await client.query(
        `insert into taxonomy_change_proposals
         (id, scheme_id, term_id, kind, status, proposed_by_account_id, payload, evidence_urls, created_at, updated_at)
         values ($1, $2, $3, $4, 'open', $5, $6::jsonb, $7, now(), now())`,
        [id, input.schemeId, input.termId ?? null, input.kind, input.accountId ?? null, JSON.stringify(input.payload), input.evidenceUrls ?? []],
      );
      await client.query(
        `insert into audit_events (account_id, action, target_type, target_id, detail)
         values ($1, 'taxonomy.proposal.created', 'taxonomy_change_proposal', $2, $3::jsonb)`,
        [input.accountId ?? null, id, JSON.stringify({ schemeId: input.schemeId, kind: input.kind, idempotencyKey })],
      );
      await client.query(
        `insert into outbox_events (topic, aggregate_type, aggregate_id, payload)
         values ('taxonomy.proposal.created', 'taxonomy_change_proposal', $1, $2::jsonb)`,
        [id, JSON.stringify({ schemeId: input.schemeId, kind: input.kind, status: "open" })],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    return { id, status: "open" };
  } finally {
    await pool.end();
  }
}

export interface TaxonomyProposalReviewResult {
  status: "updated" | "replayed" | "unchanged";
  idempotent: boolean;
  proposalId: string;
  previousStatus: string;
  currentStatus: TaxonomyReviewStatus;
}

export async function reviewTaxonomyChangeProposal(input: {
  connectionString: string;
  proposalId: string;
  reviewerAccountId: string;
  status: TaxonomyReviewStatus;
  decisionNote?: string;
  idempotencyKey: string;
}): Promise<TaxonomyProposalReviewResult> {
  if (!/^tcp_[A-Za-z0-9-]+$/.test(input.proposalId)) throw new Error("Invalid taxonomy proposal id");
  if (!TAXONOMY_REVIEW_STATUSES.includes(input.status)) throw new Error("Invalid taxonomy review status");
  if (!input.idempotencyKey || input.idempotencyKey.length > 240) throw new Error("Invalid idempotency key");
  if (input.decisionNote && input.decisionNote.length > 2_000) throw new Error("Taxonomy decision note is too long");
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const tableResult = await pool.query<{ name: string | null }>(
      `select to_regclass('public.taxonomy_change_proposals') as name
       union all select to_regclass('public.audit_events')
       union all select to_regclass('public.outbox_events')`,
    );
    if (tableResult.rows.some((row) => !row.name)) {
      const error = new Error("Taxonomy governance tables are not deployed");
      error.name = "UnavailableError";
      throw error;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
      const replay = await client.query<{ detail: Record<string, unknown> | null }>(
        `select detail from audit_events
          where account_id = $1 and action = 'taxonomy.proposal.reviewed'
            and target_type = 'taxonomy_change_proposal' and target_id = $2
            and detail->>'idempotencyKey' = $3 order by created_at desc limit 1`,
        [input.reviewerAccountId, input.proposalId, input.idempotencyKey],
      );
      const replayDetail = replay.rows[0]?.detail;
      if (replayDetail && typeof replayDetail.previousStatus === "string" && typeof replayDetail.status === "string") {
        await client.query("commit");
        return { status: "replayed", idempotent: true, proposalId: input.proposalId, previousStatus: replayDetail.previousStatus, currentStatus: replayDetail.status as TaxonomyReviewStatus };
      }
      const current = await client.query<{ status: string }>(
        "select status from taxonomy_change_proposals where id = $1 for update",
        [input.proposalId],
      );
      if (!current.rows[0]) {
        const error = new Error("Taxonomy proposal not found");
        error.name = "NotFoundError";
        throw error;
      }
      const previousStatus = current.rows[0].status;
      if (previousStatus !== "open" && previousStatus !== "researching" && previousStatus !== input.status) {
        const error = new Error("Only open or researching taxonomy proposals can be reviewed");
        error.name = "ConflictError";
        throw error;
      }
      if (previousStatus === input.status) {
        await client.query("commit");
        return { status: "unchanged", idempotent: false, proposalId: input.proposalId, previousStatus, currentStatus: input.status };
      }
      await client.query(
        `update taxonomy_change_proposals
            set status = $2, reviewed_by_account_id = $3, decision_note = $4,
                reviewed_at = now(), updated_at = now()
          where id = $1`,
        [input.proposalId, input.status, input.reviewerAccountId, input.decisionNote?.trim() || null],
      );
      const detail = { idempotencyKey: input.idempotencyKey, previousStatus, status: input.status, decisionNotePresent: Boolean(input.decisionNote?.trim()) };
      await client.query(
        `insert into audit_events (account_id, action, target_type, target_id, detail)
         values ($1, 'taxonomy.proposal.reviewed', 'taxonomy_change_proposal', $2, $3::jsonb)`,
        [input.reviewerAccountId, input.proposalId, JSON.stringify(detail)],
      );
      await client.query(
        `insert into outbox_events (topic, aggregate_type, aggregate_id, payload)
         values ('taxonomy.proposal.reviewed', 'taxonomy_change_proposal', $1, $2::jsonb)`,
        [input.proposalId, JSON.stringify({ previousStatus, status: input.status })],
      );
      await client.query("commit");
      return { status: "updated", idempotent: false, proposalId: input.proposalId, previousStatus, currentStatus: input.status };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
