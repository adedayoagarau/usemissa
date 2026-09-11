import { Pool, type QueryResultRow } from "pg";

export type DurableMaturity = "durable" | "partial" | "unavailable";

export interface DurableQueueMetric {
  maturity: DurableMaturity;
  counts: Record<string, number>;
  latest?: { status?: string; kind?: string; at?: string };
}

export interface DurableAgentRunRow {
  id: string;
  agentKind: string;
  workerKind?: string;
  status: string;
  startedAt?: string;
  heartbeatAt?: string;
  completedAt?: string;
  inputCount: number;
  outputCount: number;
  error?: string;
}

export interface DurableHandoffRow {
  id: string;
  opportunityId?: string;
  fromAgent: string;
  toAgent: string;
  kind: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
}

export interface DurableJobRow {
  id: string;
  opportunityId?: string;
  kind?: string;
  status: string;
  priority: number;
  attempts: number;
  nextAttemptAt?: string;
  leaseUntil?: string;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DurableOutboxRow {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  attempts: number;
  availableAt?: string;
  lockedAt?: string;
  processedAt?: string;
  lastError?: string;
  createdAt?: string;
}

export interface DurableAuditRow {
  id: string;
  actorAccountId?: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt?: string;
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
  auditEvents: DurableQueueMetric;
  agentRunRows: DurableAgentRunRow[];
  agentHandoffRows: DurableHandoffRow[];
  reviewJobRows: DurableJobRow[];
  enrichmentJobRows: DurableJobRow[];
  outboxRows: DurableOutboxRow[];
  auditEventRows: DurableAuditRow[];
}

const OPTIONAL_TABLES = [
  "radar_agent_runs",
  "radar_agent_handoffs",
  "radar_review_jobs",
  "radar_review_decisions",
  "radar_enrichment_jobs",
  "outbox_events",
  "audit_events",
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

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return undefined;
}

function safeError(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return value
    .replace(/(?:postgres(?:ql)?):\/\/[^\s]+/gi, "[connection redacted]")
    .replace(/(password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .slice(0, 280);
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

    const [agentRuns, agentHandoffs, reviewJobs, reviewDecisions, enrichmentJobs, outbox, auditEvents] = await Promise.all([
      metric(
        "radar_agent_runs",
        "select status, count(*)::int as count from radar_agent_runs group by status",
        "status",
        "select status, agent_kind, coalesce((metadata->>'heartbeatAt')::timestamptz, started_at) as started_at from radar_agent_runs order by coalesce((metadata->>'heartbeatAt')::timestamptz, started_at) desc limit 1",
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
      metric(
        "audit_events",
        "select 'recorded' as status, count(*)::int as count from audit_events",
        "status",
        "select 'recorded' as status, created_at from audit_events order by created_at desc limit 1",
      ),
    ]);

    const readRows = async <T extends QueryResultRow>(table: OptionalTable, query: string): Promise<T[]> => {
      if (!tableAvailability.get(table)) return [];
      try {
        return (await pool.query<T>(query)).rows;
      } catch {
        warnings.push(`${table} detail rows are unavailable`);
        return [];
      }
    };

    const [agentRunRows, agentHandoffRows, reviewJobRows, enrichmentJobRows, outboxRows, auditEventRows] = await Promise.all([
      readRows<{
        id: string;
        agent_kind: string;
        worker_kind?: string;
        status: string;
        started_at?: unknown;
        heartbeat_at?: string;
        completed_at?: unknown;
        input_count?: number | string;
        output_count?: number | string;
        error?: string;
      }>(
        "radar_agent_runs",
        `select id, agent_kind, metadata->>'workerKind' as worker_kind, status,
          started_at, metadata->>'heartbeatAt' as heartbeat_at, completed_at,
          input_count, output_count, error
         from radar_agent_runs
         order by coalesce((metadata->>'heartbeatAt')::timestamptz, started_at) desc
         limit 100`,
      ),
      readRows<{
        id: string;
        opportunity_id?: string;
        from_agent: string;
        to_agent: string;
        kind: string;
        status: string;
        created_at?: unknown;
        completed_at?: unknown;
      }>(
        "radar_agent_handoffs",
        `select id, opportunity_id, from_agent, to_agent, kind, status, created_at, completed_at
         from radar_agent_handoffs order by created_at desc limit 100`,
      ),
      readRows<{
        id: string;
        opportunity_id?: string;
        status: string;
        priority?: number | string;
        attempts?: number | string;
        next_attempt_at?: unknown;
        lease_until?: unknown;
        last_error?: string;
        created_at?: unknown;
        updated_at?: unknown;
      }>(
        "radar_review_jobs",
        `select id, opportunity_id, status, priority, attempts, next_attempt_at, lease_until,
          last_error, created_at, updated_at
         from radar_review_jobs order by priority desc, updated_at desc limit 100`,
      ),
      readRows<{
        id: string;
        opportunity_id?: string;
        kind: string;
        status: string;
        priority?: number | string;
        attempts?: number | string;
        next_attempt_at?: unknown;
        lease_until?: unknown;
        last_error?: string;
        created_at?: unknown;
        updated_at?: unknown;
      }>(
        "radar_enrichment_jobs",
        `select id, opportunity_id, kind, status, priority, attempts, next_attempt_at, lease_until,
          last_error, created_at, updated_at
         from radar_enrichment_jobs order by priority desc, updated_at desc limit 100`,
      ),
      readRows<{
        id: string;
        topic: string;
        aggregate_type: string;
        aggregate_id: string;
        status: string;
        attempts?: number | string;
        available_at?: unknown;
        locked_at?: unknown;
        processed_at?: unknown;
        last_error?: string;
        created_at?: unknown;
      }>(
        "outbox_events",
        `select id, topic, aggregate_type, aggregate_id, status, attempts, available_at,
          locked_at, processed_at, last_error, created_at
         from outbox_events order by created_at desc limit 100`,
      ),
      readRows<{
        id: string;
        account_id?: string;
        action: string;
        target_type: string;
        target_id: string;
        created_at?: unknown;
      }>(
        "audit_events",
        `select id, account_id, action, target_type, target_id, created_at
         from audit_events order by created_at desc limit 100`,
      ),
    ]);

    const normalizedAgentRuns: DurableAgentRunRow[] = agentRunRows.map((row) => ({
      id: row.id,
      agentKind: row.agent_kind,
      ...(row.worker_kind ? { workerKind: row.worker_kind } : {}),
      status: row.status,
      ...(iso(row.started_at) ? { startedAt: iso(row.started_at) } : {}),
      ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
      ...(iso(row.completed_at) ? { completedAt: iso(row.completed_at) } : {}),
      inputCount: Number(row.input_count ?? 0),
      outputCount: Number(row.output_count ?? 0),
      ...(safeError(row.error) ? { error: safeError(row.error) } : {}),
    }));
    const normalizedHandoffs: DurableHandoffRow[] = agentHandoffRows.map((row) => ({
      id: row.id,
      ...(row.opportunity_id ? { opportunityId: row.opportunity_id } : {}),
      fromAgent: row.from_agent,
      toAgent: row.to_agent,
      kind: row.kind,
      status: row.status,
      ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
      ...(iso(row.completed_at) ? { completedAt: iso(row.completed_at) } : {}),
    }));
    const normalizeJob = (row: { id: string; opportunity_id?: string; kind?: string; status: string; priority?: number | string; attempts?: number | string; next_attempt_at?: unknown; lease_until?: unknown; last_error?: string; created_at?: unknown; updated_at?: unknown }): DurableJobRow => ({
      id: row.id,
      ...(row.opportunity_id ? { opportunityId: row.opportunity_id } : {}),
      ...(row.kind ? { kind: row.kind } : {}),
      status: row.status,
      priority: Number(row.priority ?? 0),
      attempts: Number(row.attempts ?? 0),
      ...(iso(row.next_attempt_at) ? { nextAttemptAt: iso(row.next_attempt_at) } : {}),
      ...(iso(row.lease_until) ? { leaseUntil: iso(row.lease_until) } : {}),
      ...(safeError(row.last_error) ? { lastError: safeError(row.last_error) } : {}),
      ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
      ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
    });
    const normalizedOutbox: DurableOutboxRow[] = outboxRows.map((row) => ({
      id: row.id,
      topic: row.topic,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      status: row.status,
      attempts: Number(row.attempts ?? 0),
      ...(iso(row.available_at) ? { availableAt: iso(row.available_at) } : {}),
      ...(iso(row.locked_at) ? { lockedAt: iso(row.locked_at) } : {}),
      ...(iso(row.processed_at) ? { processedAt: iso(row.processed_at) } : {}),
      ...(safeError(row.last_error) ? { lastError: safeError(row.last_error) } : {}),
      ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    }));
    const normalizedAuditEvents: DurableAuditRow[] = auditEventRows.map((row) => ({
      id: row.id,
      ...(row.account_id ? { actorAccountId: row.account_id } : {}),
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    }));

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
      auditEvents,
      agentRunRows: normalizedAgentRuns,
      agentHandoffRows: normalizedHandoffs,
      reviewJobRows: reviewJobRows.map(normalizeJob),
      enrichmentJobRows: enrichmentJobRows.map(normalizeJob),
      outboxRows: normalizedOutbox,
      auditEventRows: normalizedAuditEvents,
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
      auditEvents: unavailableMetric(),
      agentRunRows: [],
      agentHandoffRows: [],
      reviewJobRows: [],
      enrichmentJobRows: [],
      outboxRows: [],
      auditEventRows: [],
    };
  } finally {
    await pool.end();
  }
}
