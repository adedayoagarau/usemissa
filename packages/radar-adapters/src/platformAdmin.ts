import { Pool } from "pg";

export type DurableMaturity = "durable" | "partial" | "unavailable";

export interface DurableQueueMetric {
  maturity: DurableMaturity;
  counts: Record<string, number>;
  latest?: { status?: string; kind?: string; at?: string };
}

export interface PlatformAdminDurableSummary {
  available: boolean;
  generatedAt: string;
  source: "optional-durable-tables";
  tables: Array<{ name: string; available: boolean }>;
  warnings: string[];
  agentRuns: DurableQueueMetric;
  agentHandoffs: DurableQueueMetric;
  reviewJobs: DurableQueueMetric;
  reviewDecisions: DurableQueueMetric;
  enrichmentJobs: DurableQueueMetric;
  outbox: DurableQueueMetric;
}

const OPTIONAL_TABLES = [
  "radar_agent_runs",
  "radar_agent_handoffs",
  "radar_review_jobs",
  "radar_review_decisions",
  "radar_enrichment_jobs",
  "outbox_events",
] as const;

type OptionalTable = (typeof OPTIONAL_TABLES)[number];

function unavailableMetric(): DurableQueueMetric {
  return { maturity: "unavailable", counts: {} };
}

function partialMetric(counts: Record<string, number>, latest?: DurableQueueMetric["latest"]): DurableQueueMetric {
  return { maturity: "partial", counts, ...(latest ? { latest } : {}) };
}

function durableMetric(counts: Record<string, number>, latest?: DurableQueueMetric["latest"]): DurableQueueMetric {
  return { maturity: "durable", counts, ...(latest ? { latest } : {}) };
}

function countRows(rows: Array<{ status?: string; decision?: string; count?: number | string }>, key: "status" | "decision" = "status"): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [String(row[key] ?? "unknown"), Number(row.count ?? 0)]));
}

/**
 * Read optional worker/agent tables without making them part of the web
 * request's availability contract. The compatibility Radar and Workspace
 * stores are loaded by their owning engines; this adapter only observes
 * additive durable queues when those tables have already been deployed.
 */
export async function readPlatformAdminDurableSummary(connectionString: string): Promise<PlatformAdminDurableSummary> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  const warnings: string[] = [];
  const tableAvailability = new Map<OptionalTable, boolean>();

  try {
    const result = await pool.query<{ name: OptionalTable; available: boolean }>(
      `select table_name as name, to_regclass('public.' || table_name) is not null as available
       from unnest($1::text[]) as tables(table_name)`,
      [OPTIONAL_TABLES],
    );
    for (const table of OPTIONAL_TABLES) tableAvailability.set(table, result.rows.find((row) => row.name === table)?.available === true);

    const metric = async (
      table: OptionalTable,
      countQuery: string,
      countKey: "status" | "decision" = "status",
      latestQuery?: string,
    ): Promise<DurableQueueMetric> => {
      if (!tableAvailability.get(table)) {
        warnings.push(`${table} is not deployed`);
        return unavailableMetric();
      }
      try {
        const countResult = await pool.query<{ status?: string; decision?: string; count?: number | string }>(countQuery);
        let latest: DurableQueueMetric["latest"];
        if (latestQuery) {
          const latestResult = await pool.query<{ status?: string; agent_kind?: string; decision?: string; started_at?: string; created_at?: string }>(latestQuery);
          const row = latestResult.rows[0];
          if (row) latest = { status: row.status ?? row.decision, kind: row.agent_kind, at: row.started_at ?? row.created_at };
        }
        return durableMetric(countRows(countResult.rows, countKey), latest);
      } catch {
        warnings.push(`${table} is present but its read shape is unavailable`);
        return partialMetric({});
      }
    };

    const [agentRuns, agentHandoffs, reviewJobs, reviewDecisions, enrichmentJobs, outbox] = await Promise.all([
      metric(
        "radar_agent_runs",
        "select status, count(*)::int as count from radar_agent_runs group by status",
        "status",
        "select status, agent_kind, started_at from radar_agent_runs order by started_at desc limit 1",
      ),
      metric("radar_agent_handoffs", "select status, count(*)::int as count from radar_agent_handoffs group by status"),
      metric(
        "radar_review_jobs",
        "select status, count(*)::int as count from radar_review_jobs group by status",
        "status",
        "select status, updated_at as created_at from radar_review_jobs order by updated_at desc limit 1",
      ),
      metric(
        "radar_review_decisions",
        "select decision, count(*)::int as count from radar_review_decisions group by decision",
        "decision",
        "select decision, created_at from radar_review_decisions order by created_at desc limit 1",
      ),
      metric(
        "radar_enrichment_jobs",
        "select status, count(*)::int as count from radar_enrichment_jobs group by status",
        "status",
        "select status, updated_at as created_at from radar_enrichment_jobs order by updated_at desc limit 1",
      ),
      metric(
        "outbox_events",
        "select status, count(*)::int as count from outbox_events group by status",
        "status",
        "select status, created_at from outbox_events order by created_at desc limit 1",
      ),
    ]);

    const available = [...tableAvailability.values()].some(Boolean);
    const missing = OPTIONAL_TABLES.filter((table) => !tableAvailability.get(table));
    if (missing.length > 0 && available) warnings.push(`Optional durable coverage is partial; missing ${missing.join(", ")}`);

    return {
      available,
      generatedAt,
      source: "optional-durable-tables",
      tables: OPTIONAL_TABLES.map((name) => ({ name, available: tableAvailability.get(name) === true })),
      warnings,
      agentRuns,
      agentHandoffs,
      reviewJobs,
      reviewDecisions,
      enrichmentJobs,
      outbox,
    };
  } catch {
    return {
      available: false,
      generatedAt,
      source: "optional-durable-tables",
      tables: OPTIONAL_TABLES.map((name) => ({ name, available: false })),
      warnings: ["Optional durable summaries could not be read; compatibility stores remain the runtime view."],
      agentRuns: unavailableMetric(),
      agentHandoffs: unavailableMetric(),
      reviewJobs: unavailableMetric(),
      reviewDecisions: unavailableMetric(),
      enrichmentJobs: unavailableMetric(),
      outbox: unavailableMetric(),
    };
  } finally {
    await pool.end();
  }
}
