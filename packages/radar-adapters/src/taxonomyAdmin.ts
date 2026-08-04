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
}

const emptyDashboard = (): TaxonomyAdminDashboard => ({
  available: false,
  generatedAt: new Date().toISOString(),
  proposals: { open: 0, researching: 0, approved: 0, rejected: 0, applied: 0 },
  coverage: { unassessed: 0, gap: 0, thin: 0, covered: 0, strong: 0, blocked: 0 },
  discovery: { queued: 0, running: 0, failed: 0, blocked: 0, candidatesAwaitingReview: 0 },
  assignments: { total: 0, byOrigin: [], byCertainty: [] },
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
    const pendingCandidates = await pool.query<{ count: number }>(`select count(*)::int as count from source_discovery_candidates where status in ('discovered', 'queued', 'reviewing')`);
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
}): Promise<{ id: string; status: "open" }> {
  if (!PROPOSAL_KINDS.has(input.kind)) throw new Error("Unsupported taxonomy proposal kind");
  const pool = new Pool({ connectionString: input.connectionString, max: 1 });
  const id = `tcp_${randomUUID()}`;
  try {
    await pool.query(
      `insert into taxonomy_change_proposals
       (id, scheme_id, term_id, kind, status, proposed_by_account_id, payload, evidence_urls, created_at, updated_at)
       values ($1, $2, $3, $4, 'open', $5, $6::jsonb, $7, now(), now())`,
      [id, input.schemeId, input.termId ?? null, input.kind, input.accountId ?? null, JSON.stringify(input.payload), input.evidenceUrls ?? []],
    );
    return { id, status: "open" };
  } finally {
    await pool.end();
  }
}
