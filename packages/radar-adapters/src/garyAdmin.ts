import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

export const GARY_QUEUE_ACTIONS = ["publish", "retry", "hold", "reject"] as const;
export type GaryQueueAction = (typeof GARY_QUEUE_ACTIONS)[number];

export interface GaryHeartbeat {
  workerKind: string;
  status: string;
  instanceId: string;
  heartbeatAt?: string;
  currentRunId?: string;
  currentJobId?: string;
  lastError?: string;
  stale: boolean;
}

export interface GarySourceHealth {
  id: string;
  name: string;
  backfillStatus: string;
  enabled: boolean;
  freshnessHours: number;
  nextRefreshAt?: string;
  lastSuccessfulAt?: string;
  consecutiveFailures: number;
  lastError?: string;
}

export interface GaryReviewRow {
  id: string;
  opportunityId: string;
  title: string;
  organizer: string;
  deadline?: string;
  status: string;
  recommendation?: string;
  confidence?: number;
  hostStatus?: string;
  sourceUrl: string;
  officialUrl?: string;
  attempts: number;
  requestedAction?: string;
  reasons: string[];
  lastError?: string;
  updatedAt?: string;
}

export interface GaryDashboardData {
  available: boolean;
  generatedAt: string;
  warnings: string[];
  summary: {
    total: number;
    queued: number;
    processing: number;
    published: number;
    needsHuman: number;
    failed: number;
    estimatedCostUsd: number;
  };
  readiness: {
    crawler: boolean;
    reviewer: boolean;
    email: boolean;
    model: string;
    publishThreshold: number;
    reviewHour: number;
    timezone: string;
  };
  heartbeats: GaryHeartbeat[];
  sources: GarySourceHealth[];
  rows: GaryReviewRow[];
  latestDigest?: { date: string; status: string; sentAt?: string; error?: string };
  retention: Array<{ data: string; retainFor: string; cleanup: string }>;
}

interface DbRow extends Record<string, unknown> {}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value ? value : undefined;
}

function num(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

async function tablePresent(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    "select to_regclass('public.' || $1) is not null as present",
    [table],
  );
  return result.rows[0]?.present === true;
}

function empty(generatedAt: string, warning: string): GaryDashboardData {
  return {
    available: false,
    generatedAt,
    warnings: [warning],
    summary: { total: 0, queued: 0, processing: 0, published: 0, needsHuman: 0, failed: 0, estimatedCostUsd: 0 },
    readiness: { crawler: false, reviewer: false, email: false, model: "deepseek-v4-flash", publishThreshold: 0.85, reviewHour: 8, timezone: "America/Los_Angeles" },
    heartbeats: [],
    sources: [],
    rows: [],
    retention: retentionPolicy(),
  };
}

function retentionPolicy(): GaryDashboardData["retention"] {
  return [
    { data: "Canonical records, extracted facts, decisions, hashes", retainFor: "Indefinitely", cleanup: "Never automatic" },
    { data: "Raw HTML and text evidence", retainFor: "365 days", cleanup: "Dry-run before deletion" },
    { data: "Rendered files and non-public media", retainFor: "180 days", cleanup: "Dry-run before deletion" },
    { data: "Model prompt payloads and raw outputs", retainFor: "180 days", cleanup: "Keep hashes, decision, and cost indefinitely" },
    { data: "Operational errors and failed payloads", retainFor: "90 days", cleanup: "Only terminal rows" },
  ];
}

export async function readGaryDashboard(connectionString: string, options: { limit?: number } = {}): Promise<GaryDashboardData> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 4_000 });
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
  try {
    if (!(await tablePresent(pool, "gary_review_queue"))) {
      return empty(generatedAt, "Gary harness tables are not deployed yet.");
    }
    const [countsResult, costResult, heartbeatResult, sourceResult, rowsResult, digestResult] = await Promise.all([
      pool.query<DbRow>("select status, count(*)::int as count from gary_review_queue where status <> 'superseded' group by status"),
      pool.query<DbRow>("select coalesce(sum(estimated_cost_usd), 0)::float8 as cost from gary_ai_review_decisions where created_at >= current_date"),
      pool.query<DbRow>(`select worker_kind, status, instance_id, current_run_id, current_job_id,
                                last_error, heartbeat_at,
                                heartbeat_at < now() - interval '3 minutes' as stale
                           from gary_worker_heartbeats order by worker_kind`),
      pool.query<DbRow>(`select id, name, backfill_status, enabled, freshness_hours, next_refresh_at,
                                last_successful_at, consecutive_failures, last_error
                           from gary_sources order by name`),
      pool.query<DbRow>(`select q.id, q.opportunity_id, g.title, g.organizer, co.deadline,
                                q.status, q.recommendation, q.confidence, co.host_status,
                                co.source_detail_url, co.official_website, q.attempts,
                                q.requested_action, d.reasons_json, q.last_error, q.updated_at
                           from gary_review_queue q
                           join gary_opportunities g on g.id = q.opportunity_id
                           join gary_call_observations co on co.id = q.observation_id
                           left join gary_ai_review_decisions d on d.id = q.decision_id
                          where q.status <> 'superseded'
                          order by case q.status when 'needs_human' then 0 when 'failed' then 1
                                    when 'queued' then 2 when 'processing' then 3 else 4 end,
                                   q.updated_at desc limit $1`, [limit]),
      pool.query<DbRow>(`select digest_date, status, sent_at, error from gary_daily_digests
                          order by digest_date desc, created_at desc limit 1`),
    ]);
    const counts = Object.fromEntries(countsResult.rows.map((row) => [String(row.status), num(row.count)]));
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const heartbeats: GaryHeartbeat[] = heartbeatResult.rows.map((row) => ({
      workerKind: String(row.worker_kind), status: String(row.status), instanceId: String(row.instance_id),
      ...(iso(row.heartbeat_at) ? { heartbeatAt: iso(row.heartbeat_at) } : {}),
      ...(row.current_run_id ? { currentRunId: String(row.current_run_id) } : {}),
      ...(row.current_job_id ? { currentJobId: String(row.current_job_id) } : {}),
      ...(row.last_error ? { lastError: String(row.last_error) } : {}), stale: row.stale === true,
    }));
    const heartbeat = (kind: string) => heartbeats.find((row) => row.workerKind === kind);
    const latestDigest = digestResult.rows[0];
    return {
      available: true,
      generatedAt,
      warnings: heartbeats.some((row) => row.stale) ? ["One or more Gary Railway workers have a stale database heartbeat."] : [],
      summary: {
        total, queued: counts.queued ?? 0, processing: counts.processing ?? 0,
        published: counts.published ?? 0, needsHuman: counts.needs_human ?? 0,
        failed: counts.failed ?? 0, estimatedCostUsd: num(costResult.rows[0]?.cost),
      },
      readiness: {
        crawler: Boolean(heartbeat("crawler") && !heartbeat("crawler")?.stale),
        reviewer: Boolean(heartbeat("reviewer") && !heartbeat("reviewer")?.stale),
        email: latestDigest?.status === "sent",
        model: process.env.GARY_DEEPSEEK_MODEL ?? "deepseek-v4-flash",
        publishThreshold: num(process.env.GARY_PUBLISH_THRESHOLD || 0.85),
        reviewHour: num(process.env.GARY_REVIEW_HOUR || 8),
        timezone: process.env.GARY_REVIEW_TIMEZONE ?? "America/Los_Angeles",
      },
      heartbeats,
      sources: sourceResult.rows.map((row) => ({
        id: String(row.id), name: String(row.name), backfillStatus: String(row.backfill_status),
        enabled: row.enabled === true, freshnessHours: num(row.freshness_hours),
        ...(iso(row.next_refresh_at) ? { nextRefreshAt: iso(row.next_refresh_at) } : {}),
        ...(iso(row.last_successful_at) ? { lastSuccessfulAt: iso(row.last_successful_at) } : {}),
        consecutiveFailures: num(row.consecutive_failures),
        ...(row.last_error ? { lastError: String(row.last_error) } : {}),
      })),
      rows: rowsResult.rows.map((row) => ({
        id: String(row.id), opportunityId: String(row.opportunity_id), title: String(row.title),
        organizer: String(row.organizer), ...(row.deadline ? { deadline: String(row.deadline) } : {}),
        status: String(row.status), ...(row.recommendation ? { recommendation: String(row.recommendation) } : {}),
        ...(row.confidence != null ? { confidence: num(row.confidence) } : {}),
        ...(row.host_status ? { hostStatus: String(row.host_status) } : {}),
        sourceUrl: String(row.source_detail_url), ...(row.official_website ? { officialUrl: String(row.official_website) } : {}),
        attempts: num(row.attempts), ...(row.requested_action ? { requestedAction: String(row.requested_action) } : {}),
        reasons: Array.isArray(row.reasons_json) ? row.reasons_json.map(String) : [],
        ...(row.last_error ? { lastError: String(row.last_error) } : {}),
        ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
      })),
      ...(latestDigest ? { latestDigest: {
        date: String(latestDigest.digest_date), status: String(latestDigest.status),
        ...(iso(latestDigest.sent_at) ? { sentAt: iso(latestDigest.sent_at) } : {}),
        ...(latestDigest.error ? { error: String(latestDigest.error) } : {}),
      } } : {}),
      retention: retentionPolicy(),
    };
  } catch {
    return empty(generatedAt, "Gary's durable control plane could not be read.");
  } finally {
    await pool.end().catch(() => undefined);
  }
}

function assertId(value: string): void {
  if (!/^review_[a-f0-9]{32}$/.test(value)) throw new Error("Invalid Gary review job id");
}

function assertIdempotency(value: string): void {
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("Invalid idempotency key");
}

async function audit(client: PoolClient, actor: string, idempotencyKey: string, action: GaryQueueAction, jobId: string, note?: string): Promise<void> {
  await client.query(
    `insert into gary_harness_audit_events(
       id, idempotency_key, actor_type, actor_id, action, target_type, target_id, payload_json
     ) values($1, $2, 'operator', $3, $4, 'review-job', $5, $6::jsonb)`,
    [`audit_${randomUUID().replaceAll("-", "")}`, idempotencyKey, actor, `queue.${action}`, jobId, JSON.stringify({ note })],
  );
}

export async function mutateGaryQueue(
  connectionString: string,
  input: { jobId: string; action: GaryQueueAction; actorAccountId: string; idempotencyKey: string; note?: string },
): Promise<{ idempotent: boolean; jobId: string; status: string }> {
  assertId(input.jobId);
  assertIdempotency(input.idempotencyKey);
  if (!GARY_QUEUE_ACTIONS.includes(input.action)) throw new Error("Invalid Gary queue action");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 4_000 });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const replay = await client.query<{ target_id: string }>(
      "select target_id from gary_harness_audit_events where idempotency_key = $1",
      [input.idempotencyKey],
    );
    if (replay.rows[0]) {
      const current = await client.query<{ status: string }>("select status from gary_review_queue where id = $1", [input.jobId]);
      await client.query("commit");
      return { idempotent: true, jobId: input.jobId, status: current.rows[0]?.status ?? "unknown" };
    }
    const mapping: Record<GaryQueueAction, { status: string; requested: string }> = {
      publish: { status: "queued", requested: "publish" },
      retry: { status: "queued", requested: "retry" },
      hold: { status: "held", requested: "hold" },
      reject: { status: "rejected", requested: "reject" },
    };
    const next = mapping[input.action];
    const result = await client.query<{ status: string }>(
      `update gary_review_queue set status = $2, requested_action = $3, requested_by = $4,
              operator_note = $5, available_at = now(), lease_owner = null, lease_until = null,
              last_error = case when $2 = 'queued' then null else last_error end, updated_at = now()
        where id = $1 returning status`,
      [input.jobId, next.status, next.requested, input.actorAccountId, input.note?.slice(0, 1000)],
    );
    if (!result.rows[0]) throw Object.assign(new Error("Gary review job not found"), { name: "NotFoundError" });
    await audit(client, input.actorAccountId, input.idempotencyKey, input.action, input.jobId, input.note);
    await client.query("commit");
    return { idempotent: false, jobId: input.jobId, status: result.rows[0].status };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end().catch(() => undefined);
  }
}
