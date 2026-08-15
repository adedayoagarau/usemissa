import type { Pool, PoolClient } from "pg";
import { GenericHtmlAdapter } from "./adapters/html.js";
import { isPotentialDestination } from "./destinations.js";
import { buildOpportunityIdentity, compareOpportunityIdentityDetailed } from "./identity.js";
import { createRunId } from "./contracts.js";
import type { SourceDefinition } from "./contracts.js";

/**
 * Repairs canonical opportunities that were quarantined for lacking a
 * reconciled first-party destination — the 357-record backlog: directory
 * listings written before destination reconciliation existed, holding a
 * directory URL as their only "official source."
 *
 * This does not re-run extraction. The opportunity's own title (and, where
 * resolvable, organization) are already canonical, more authoritative than
 * anything a fresh scrape of the directory would produce. What is missing is
 * a first-party destination that reconciles against that title — exactly the
 * fetch → discover-candidates → compare-identity sequence the ingestion
 * pipeline already does, run backwards from an existing record instead of a
 * fresh source.
 */

export const repairDecisionSchema = `
create table if not exists missa_ingestion_v2_repair_decisions (
  id bigserial primary key,
  opportunity_id text not null,
  decision text not null check (decision in ('repaired', 'unresolved', 'error')),
  candidate_count integer not null default 0,
  authoritative_url text,
  basis text,
  reasons jsonb not null default '[]'::jsonb,
  applied boolean not null default false,
  decided_at timestamptz not null default now()
);
create index if not exists missa_ingestion_v2_repair_decisions_opportunity_idx
  on missa_ingestion_v2_repair_decisions(opportunity_id, decided_at desc);
`;

export async function ensureRepairSchema(pool: Pool): Promise<void> {
  await pool.query(repairDecisionSchema);
}

export interface RepairCandidateRow {
  opportunity_id: string;
  title: string;
  organization_name: string | null;
  source_url: string;
  source_kind: string;
}

/** Directory-sourced, reviewable, and not already reconciled — the shape of the quarantined backlog. */
async function findCandidates(pool: Pool, limit: number): Promise<RepairCandidateRow[]> {
  const result = await pool.query<RepairCandidateRow>(
    `select o.id as opportunity_id, o.title,
            coalesce(org.data->>'name', o.organization_id) as organization_name,
            s.url as source_url, s.kind as source_kind
     from opportunities o
     join opportunity_sources s on s.id = o.source_id
     left join radar_organizations org on org.id = o.organization_id
     left join lateral (
       select destination_reconciled from opportunity_source_evidence
       where opportunity_id = o.id order by checked_at desc limit 1
     ) evidence on true
     where o.publication_state = 'reviewable'
       and s.kind = 'directory'
       and coalesce(evidence.destination_reconciled, false) = false
     order by o.id
     limit $1`,
    [Math.min(Math.max(limit, 1), 200)],
  );
  return result.rows;
}

export interface RepairResult {
  opportunityId: string;
  decision: "repaired" | "unresolved" | "error";
  candidateCount: number;
  authoritativeUrl: string | null;
  basis: string | null;
  reasons: string[];
  applied: boolean;
}

/**
 * A minimal SourceDefinition so isPotentialDestination's directory-page rule
 * (external, call-shaped outbound links) applies the same way it does inside
 * the live pipeline. The repair job is not crawling a registry source, so
 * most fields are placeholders; only `url` and `kind` affect the check.
 */
function syntheticSource(row: RepairCandidateRow): SourceDefinition {
  return {
    id: `repair:${row.opportunity_id}`,
    name: "repair",
    url: row.source_url,
    adapterId: "generic-html-v2",
    kind: "directory",
    geography: ["global"],
    opportunityTypes: [],
    config: {},
    schedule: { lane: "held", cadenceHours: 168 },
  };
}

async function repairOne(row: RepairCandidateRow, adapter: GenericHtmlAdapter, logger: Pick<Console, "warn">): Promise<Omit<RepairResult, "applied">> {
  const source = syntheticSource(row);
  const runId = createRunId(row.opportunity_id);
  const run = { id: runId, sourceId: source.id, trigger: "manual" as const, mode: "shadow" as const, status: "running" as const, createdAt: new Date().toISOString() };

  let snapshot;
  try {
    snapshot = await adapter.fetch({ run, source });
  } catch (error) {
    return { opportunityId: row.opportunity_id, decision: "error", candidateCount: 0, authoritativeUrl: null, basis: null, reasons: [`Source fetch failed: ${error instanceof Error ? error.message : String(error)}`] };
  }
  const extraction = await adapter.extract({ run, source, snapshot }, snapshot);
  const candidates = extraction.candidateLinks.filter((candidate) => isPotentialDestination(source, candidate)).slice(0, 5);
  if (!candidates.length) return { opportunityId: row.opportunity_id, decision: "unresolved", candidateCount: 0, authoritativeUrl: null, basis: null, reasons: ["No first-party destination candidate was found on the source page."] };

  // The opportunity's own stored title/organization are the identity to
  // reconcile against — more authoritative than anything re-extracted from
  // the directory listing, and this is exactly the record already published
  // once (in error) under that title.
  const opportunityIdentity = { key: "opportunity", canonicalUrl: null, title: row.title, organization: row.organization_name, deadline: null };

  for (const candidate of candidates) {
    let destinationSnapshot;
    try {
      destinationSnapshot = await adapter.fetch({ run, source: { ...source, id: `${source.id}:destination`, url: candidate.url } });
    } catch (error) {
      logger.warn(`[missa-ingestion-v2] repair destination fetch failed for ${row.opportunity_id} -> ${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const destinationExtraction = await adapter.extract({ run, source, snapshot: destinationSnapshot }, destinationSnapshot);
    const destinationIdentity = buildOpportunityIdentity(destinationExtraction, destinationSnapshot.finalUrl || destinationSnapshot.url);
    const identity = compareOpportunityIdentityDetailed(opportunityIdentity, destinationIdentity);
    if (identity.decision === "same") {
      return { opportunityId: row.opportunity_id, decision: "repaired", candidateCount: candidates.length, authoritativeUrl: destinationSnapshot.finalUrl || destinationSnapshot.url, basis: identity.basis, reasons: [`Reconciled to ${destinationIdentity.title ?? "the destination page"} via ${identity.basis}.`] };
    }
  }
  return { opportunityId: row.opportunity_id, decision: "unresolved", candidateCount: candidates.length, authoritativeUrl: null, basis: null, reasons: [`${candidates.length} candidate destination(s) fetched; none reconciled to "${row.title}".`] };
}

async function applyRepair(client: PoolClient, opportunityId: string, url: string): Promise<void> {
  const host = new URL(url).host;
  await client.query(
    `update opportunities set guidelines_url = $2, submission_url = coalesce(submission_url, $2), submission_host = coalesce(submission_host, $3), updated_at = now() where id = $1`,
    [opportunityId, url, host],
  );
  await client.query(
    `insert into opportunity_source_evidence (id, opportunity_id, source_id, kind, name, url, checked_at, processing_succeeded_at, organization_confirmed, destination_reconciled, destination_reconciliation)
     select $1, o.id, o.source_id, 'directory', 'repair', $2, now(), now(), true, true, '{"basis":"repair"}'::jsonb
     from opportunities o where o.id = $3
     on conflict (id) do update set checked_at = now(), processing_succeeded_at = now(), destination_reconciled = true, destination_reconciliation = excluded.destination_reconciliation`,
    [`${opportunityId}:evidence:repair`, url, opportunityId],
  );
}

export interface RepairTickOptions {
  limit?: number;
  apply?: boolean;
  logger?: Pick<Console, "info" | "warn">;
}

export interface RepairTickResult {
  considered: number;
  applied: boolean;
  repaired: number;
  unresolved: number;
  error: number;
}

export async function runRepairTick(pool: Pool, options: RepairTickOptions = {}): Promise<RepairTickResult> {
  const logger = options.logger ?? console;
  const apply = options.apply ?? false;
  await ensureRepairSchema(pool);
  const adapter = new GenericHtmlAdapter();
  const rows = await findCandidates(pool, options.limit ?? 25);
  const counts = { repaired: 0, unresolved: 0, error: 0 };

  for (const row of rows) {
    const outcome = await repairOne(row, adapter, logger);
    counts[outcome.decision] += 1;
    let applied = false;
    if (apply && outcome.decision === "repaired" && outcome.authoritativeUrl) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await applyRepair(client, row.opportunity_id, outcome.authoritativeUrl);
        await client.query("commit");
        applied = true;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        logger.warn(`[missa-ingestion-v2] repair apply failed for ${row.opportunity_id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        client.release();
      }
    }
    await pool.query(
      `insert into missa_ingestion_v2_repair_decisions (opportunity_id, decision, candidate_count, authoritative_url, basis, reasons, applied)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [row.opportunity_id, outcome.decision, outcome.candidateCount, outcome.authoritativeUrl, outcome.basis, JSON.stringify(outcome.reasons), applied],
    ).catch((error) => logger.warn(`[missa-ingestion-v2] repair decision record failed for ${row.opportunity_id}: ${error instanceof Error ? error.message : String(error)}`));
  }

  logger.info(`[missa-ingestion-v2] repair tick: considered=${rows.length} apply=${apply} decisions=${JSON.stringify(counts)}`);
  return { considered: rows.length, applied: apply, ...counts };
}

export function repairApplyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MISSA_INGESTION_V2_REPAIR_APPLY === "1";
}
