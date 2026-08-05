import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

export const platformAdminFoundationsSchema = `
create table if not exists platform_message_effects (
  id text primary key,
  organization_id text,
  account_id text,
  kind text not null,
  provider text not null,
  idempotency_key text not null unique,
  status text not null default 'pending',
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (status in ('pending', 'sending', 'sent', 'failed', 'suppressed')),
  check (attempt_count >= 0)
);
create index if not exists platform_message_effects_status_idx
  on platform_message_effects (status, updated_at);
create index if not exists platform_message_effects_account_idx
  on platform_message_effects (account_id, created_at);

create table if not exists platform_message_attempts (
  id text primary key,
  effect_id text not null references platform_message_effects(id) on delete cascade,
  attempt_number integer not null,
  provider text not null,
  status text not null default 'started',
  provider_message_id text,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (effect_id, attempt_number),
  check (status in ('started', 'sent', 'failed')),
  check (attempt_number >= 1)
);
create index if not exists platform_message_attempts_status_idx
  on platform_message_attempts (status, started_at);

create table if not exists platform_crm_timeline_events (
  id text primary key,
  organization_id text,
  account_id text,
  event_type text not null,
  source text not null,
  title text not null,
  body text,
  actor_account_id text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_crm_timeline_org_created_idx
  on platform_crm_timeline_events (organization_id, created_at);
create index if not exists platform_crm_timeline_account_created_idx
  on platform_crm_timeline_events (account_id, created_at);
create index if not exists platform_crm_timeline_type_created_idx
  on platform_crm_timeline_events (event_type, created_at);

create table if not exists platform_billing_ledger (
  id text primary key,
  organization_id text,
  provider text not null default 'stripe',
  provider_event_id text not null,
  provider_object_id text,
  event_type text not null,
  entry_type text not null,
  status text not null default 'received',
  amount_cents integer,
  currency text,
  customer_id text,
  subscription_id text,
  invoice_id text,
  occurred_at timestamptz,
  processed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id, entry_type),
  check (status in ('received', 'processed', 'failed', 'ignored')),
  check (amount_cents is null or amount_cents >= 0)
);
create index if not exists platform_billing_ledger_org_created_idx
  on platform_billing_ledger (organization_id, created_at);
create index if not exists platform_billing_ledger_status_created_idx
  on platform_billing_ledger (status, created_at);

create table if not exists platform_agent_control_requests (
  id text primary key,
  operation_id text not null,
  target_type text not null,
  target_id text not null,
  expected_state text,
  action text not null,
  status text not null default 'requested',
  actor_account_id text not null,
  idempotency_key text not null unique,
  policy_version text not null default 'agent-control.v1',
  reason text,
  expires_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (status in ('requested', 'accepted', 'applied', 'rejected', 'failed', 'cancelled')),
  check (action in ('pause', 'resume', 'cancel', 'replay', 'requeue', 'release-stale'))
);
alter table platform_agent_control_requests add column if not exists operation_id text;
update platform_agent_control_requests set operation_id = id where operation_id is null;
alter table platform_agent_control_requests alter column operation_id set not null;
alter table platform_agent_control_requests add column if not exists expected_state text;
alter table platform_agent_control_requests add column if not exists policy_version text not null default 'agent-control.v1';
alter table platform_agent_control_requests add column if not exists expires_at timestamptz;
create index if not exists platform_agent_control_requests_target_idx
  on platform_agent_control_requests (target_type, target_id, created_at);
create index if not exists platform_agent_control_requests_status_idx
  on platform_agent_control_requests (status, created_at);
`;

const FOUNDATION_TABLES = [
  "platform_message_effects",
  "platform_message_attempts",
  "platform_crm_timeline_events",
  "platform_billing_ledger",
  "platform_agent_control_requests",
] as const;

type FoundationTable = (typeof FOUNDATION_TABLES)[number];
type JsonRecord = Record<string, unknown>;

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return undefined;
}

function text(value: unknown, max = 2_000): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return value.slice(0, max);
}

function safeError(value: unknown): string | undefined {
  return text(value, 500)
    ?.replace(/(?:postgres(?:ql)?):\/\/[^\s]+/gi, "[connection redacted]")
    .replace(/(password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function assertIdempotencyKey(value: string): void {
  if (typeof value !== "string" || value.trim().length < 8 || value.length > 240) {
    throw new Error("Invalid idempotency key");
  }
}

function assertIdentifier(value: string, label: string): void {
  if (!value || value.length > 240 || !/^[A-Za-z0-9_:./-]+$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

function json(value: JsonRecord | undefined): string {
  return JSON.stringify(value ?? {});
}

async function tablePresent(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    "select to_regclass('public.' || $1) is not null as present",
    [table],
  );
  return result.rows[0]?.present === true;
}

async function tableAvailability(pool: Pool, tables: readonly string[]): Promise<Map<string, boolean>> {
  const result = await pool.query<{ table_name: string; available: boolean }>(
    `select table_name, to_regclass('public.' || table_name) is not null as available
       from unnest($1::text[]) as requested(table_name)`,
    [tables],
  );
  return new Map(tables.map((table) => [table, result.rows.find((row) => row.table_name === table)?.available === true]));
}

function missingTables(availability: Map<string, boolean>, tables: readonly string[]): string[] {
  return tables.filter((table) => !availability.get(table));
}

async function writeAudit(
  client: PoolClient,
  input: { actorAccountId?: string; organizationId?: string; action: string; targetType: string; targetId: string; detail?: JsonRecord },
): Promise<void> {
  await client.query(
    `insert into audit_events (account_id, organization_id, action, target_type, target_id, detail)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [input.actorAccountId ?? null, input.organizationId ?? null, input.action, input.targetType, input.targetId, json(input.detail)],
  );
}

async function writeOutbox(
  client: PoolClient,
  input: { topic: string; aggregateType: string; aggregateId: string; payload?: JsonRecord },
): Promise<void> {
  await client.query(
    `insert into outbox_events (topic, aggregate_type, aggregate_id, payload)
     values ($1, $2, $3, $4::jsonb)`,
    [input.topic, input.aggregateType, input.aggregateId, json(input.payload)],
  );
}

export async function ensurePlatformAdminFoundationsSchema(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query(platformAdminFoundationsSchema);
  } finally {
    await pool.end();
  }
}

export type PlatformMessageEffectStatus = "pending" | "sending" | "sent" | "failed" | "suppressed";

export interface PlatformMessageEffect {
  id: string;
  accountId?: string;
  organizationId?: string;
  kind: string;
  provider: string;
  status: PlatformMessageEffectStatus | string;
  attemptCount: number;
  providerMessageIdPresent: boolean;
  lastError?: string;
  requestedAt?: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformMessageAttempt {
  id: string;
  effectId: string;
  attemptNumber: number;
  provider: string;
  status: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PlatformAdminMessageHistory {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: { effects: number; attempts: number; byStatus: Record<string, number>; attemptsByStatus: Record<string, number> };
  effects: PlatformMessageEffect[];
  attempts: PlatformMessageAttempt[];
}

interface MessageEffectRow extends QueryResultRow {
  id: string;
  account_id?: string | null;
  organization_id?: string | null;
  kind: string;
  provider: string;
  status: string;
  attempt_count?: number | string;
  provider_message_id?: string | null;
  last_error?: string | null;
  requested_at?: unknown;
  sent_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

function normalizeMessageEffect(row: MessageEffectRow): PlatformMessageEffect {
  return {
    id: row.id,
    ...(text(row.account_id, 240) ? { accountId: text(row.account_id, 240) } : {}),
    ...(text(row.organization_id, 240) ? { organizationId: text(row.organization_id, 240) } : {}),
    kind: row.kind,
    provider: row.provider,
    status: row.status,
    attemptCount: numberValue(row.attempt_count),
    providerMessageIdPresent: Boolean(row.provider_message_id),
    ...(safeError(row.last_error) ? { lastError: safeError(row.last_error) } : {}),
    ...(iso(row.requested_at) ? { requestedAt: iso(row.requested_at) } : {}),
    ...(iso(row.sent_at) ? { sentAt: iso(row.sent_at) } : {}),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
  };
}

function emptyMessageHistory(generatedAt: string, warnings: string[]): PlatformAdminMessageHistory {
  return {
    available: false,
    generatedAt,
    source: "platform_message_effects + platform_message_attempts",
    warnings,
    summary: { effects: 0, attempts: 0, byStatus: {}, attemptsByStatus: {} },
    effects: [],
    attempts: [],
  };
}

export async function readPlatformAdminMessageHistory(
  connectionString: string,
  options: { limit?: number } = {},
): Promise<PlatformAdminMessageHistory> {
  const generatedAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const availability = await tableAvailability(pool, ["platform_message_effects", "platform_message_attempts"]);
    const missing = missingTables(availability, ["platform_message_effects", "platform_message_attempts"]);
    if (missing.length > 0) return emptyMessageHistory(generatedAt, [`${missing.join(", ")} is not deployed; provider delivery history is unavailable.`]);
    const [counts, attemptCounts, effects, attempts] = await Promise.all([
      pool.query<{ status: string; count: number | string }>("select status, count(*)::int as count from platform_message_effects group by status"),
      pool.query<{ status: string; count: number | string }>("select status, count(*)::int as count from platform_message_attempts group by status"),
      pool.query<MessageEffectRow>(
        `select id, account_id, organization_id, kind, provider, status, attempt_count,
                provider_message_id, last_error, requested_at, sent_at, created_at, updated_at
           from platform_message_effects order by created_at desc limit $1`,
        [limit],
      ),
      pool.query<MessageAttemptRow>(
        `select id, effect_id, attempt_number, provider, status, error, started_at, completed_at
           from platform_message_attempts order by started_at desc limit $1`,
        [limit],
      ),
    ]);
    return {
      available: true,
      generatedAt,
      source: "platform_message_effects + platform_message_attempts",
      warnings: [],
      summary: {
        effects: counts.rows.reduce((sum, row) => sum + numberValue(row.count), 0),
        attempts: attemptCounts.rows.reduce((sum, row) => sum + numberValue(row.count), 0),
        byStatus: Object.fromEntries(counts.rows.map((row) => [row.status, numberValue(row.count)])),
        attemptsByStatus: Object.fromEntries(attemptCounts.rows.map((row) => [row.status, numberValue(row.count)])),
      },
      effects: effects.rows.map(normalizeMessageEffect),
      attempts: attempts.rows.map(normalizeMessageAttempt),
    };
  } catch {
    return emptyMessageHistory(generatedAt, ["Provider delivery history could not be read; no delivery state is inferred from compatibility alerts."]);
  } finally {
    await pool.end();
  }
}

interface MessageAttemptRow extends QueryResultRow {
  id: string;
  effect_id: string;
  attempt_number: number | string;
  provider: string;
  status: string;
  error?: string | null;
  started_at?: unknown;
  completed_at?: unknown;
}

function normalizeMessageAttempt(row: MessageAttemptRow): PlatformMessageAttempt {
  return {
    id: row.id,
    effectId: row.effect_id,
    attemptNumber: numberValue(row.attempt_number),
    provider: row.provider,
    status: row.status,
    ...(safeError(row.error) ? { error: safeError(row.error) } : {}),
    ...(iso(row.started_at) ? { startedAt: iso(row.started_at) } : {}),
    ...(iso(row.completed_at) ? { completedAt: iso(row.completed_at) } : {}),
  };
}

export interface BeginPlatformMessageEffectInput {
  idempotencyKey: string;
  accountId?: string;
  organizationId?: string;
  kind: string;
  provider: string;
  metadata?: JsonRecord;
  retryFailed?: boolean;
}

export interface BeginPlatformMessageEffectResult {
  status: "started" | "replayed";
  idempotent: boolean;
  shouldDeliver: boolean;
  effectId: string;
  attemptNumber: number;
  currentStatus: string;
}

export async function beginPlatformMessageEffect(
  connectionString: string,
  input: BeginPlatformMessageEffectInput,
): Promise<BeginPlatformMessageEffectResult> {
  assertIdempotencyKey(input.idempotencyKey);
  assertIdentifier(input.kind, "message kind");
  assertIdentifier(input.provider, "message provider");
  await ensurePlatformAdminFoundationsSchema(connectionString);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const availability = await tableAvailability(pool, ["platform_message_effects", "platform_message_attempts", "audit_events", "outbox_events"]);
    const missing = missingTables(availability, ["platform_message_effects", "platform_message_attempts", "audit_events", "outbox_events"]);
    if (missing.length > 0) throw new Error(`${missing.join(", ")} is not deployed`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
      const existing = await client.query<{ id: string; kind: string; provider: string; status: string; attempt_count: number | string }>(
        `select id, kind, provider, status, attempt_count
           from platform_message_effects where idempotency_key = $1 for update`,
        [input.idempotencyKey],
      );
      const row = existing.rows[0];
      if (row && (row.kind !== input.kind || row.provider !== input.provider)) {
        const error = new Error("Idempotency key belongs to another message effect");
        error.name = "ConflictError";
        throw error;
      }
      if (row && (row.status === "sent" || row.status === "suppressed" || (!input.retryFailed && row.status !== "failed"))) {
        await client.query("commit");
        return { status: "replayed", idempotent: true, shouldDeliver: false, effectId: row.id, attemptNumber: numberValue(row.attempt_count), currentStatus: row.status };
      }
      const effectId = row?.id ?? `msg_${randomUUID()}`;
      const attemptNumber = numberValue(row?.attempt_count) + 1;
      if (row) {
        await client.query(
          `update platform_message_effects
              set status = 'sending', attempt_count = $2, last_error = null, updated_at = now()
            where id = $1`,
          [effectId, attemptNumber],
        );
      } else {
        await client.query(
          `insert into platform_message_effects
             (id, organization_id, account_id, kind, provider, idempotency_key, status, attempt_count, metadata)
           values ($1, $2, $3, $4, $5, $6, 'sending', $7, $8::jsonb)`,
          [effectId, input.organizationId ?? null, input.accountId ?? null, input.kind, input.provider, input.idempotencyKey, attemptNumber, json(input.metadata)],
        );
      }
      await client.query(
        `insert into platform_message_attempts (id, effect_id, attempt_number, provider, metadata)
         values ($1, $2, $3, $4, $5::jsonb)`,
        [`msg_attempt_${randomUUID()}`, effectId, attemptNumber, input.provider, json(input.metadata)],
      );
      await writeAudit(client, {
        actorAccountId: input.accountId,
        organizationId: input.organizationId,
        action: "message.effect.requested",
        targetType: "message_effect",
        targetId: effectId,
        detail: { kind: input.kind, provider: input.provider, idempotencyKey: input.idempotencyKey, attemptNumber },
      });
      await writeOutbox(client, {
        topic: "message.effect.requested",
        aggregateType: "message_effect",
        aggregateId: effectId,
        payload: { kind: input.kind, provider: input.provider, attemptNumber },
      });
      await client.query("commit");
      return { status: "started", idempotent: false, shouldDeliver: true, effectId, attemptNumber, currentStatus: "sending" };
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

export async function completePlatformMessageEffect(input: {
  connectionString: string;
  effectId: string;
  attemptNumber: number;
  status: "sent" | "failed";
  providerMessageId?: string;
  error?: string;
}): Promise<void> {
  assertIdentifier(input.effectId, "message effect id");
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const current = await client.query<{ organization_id?: string | null; account_id?: string | null }>(
        "select organization_id, account_id from platform_message_effects where id = $1 for update",
        [input.effectId],
      );
      if (!current.rows[0]) throw new Error("Message effect not found");
      const errorText = safeError(input.error);
      await client.query(
        `update platform_message_attempts
            set status = $3, provider_message_id = $4, error = $5, completed_at = now()
          where effect_id = $1 and attempt_number = $2`,
        [input.effectId, input.attemptNumber, input.status, input.providerMessageId ?? null, errorText ?? null],
      );
      await client.query(
        `update platform_message_effects
            set status = $2, provider_message_id = coalesce($3, provider_message_id),
                last_error = $4, sent_at = case when $2 = 'sent' then now() else sent_at end,
                updated_at = now()
          where id = $1`,
        [input.effectId, input.status, input.providerMessageId ?? null, errorText ?? null],
      );
      await client.query(
        `update outbox_events set status = $2, attempts = greatest(attempts, $3),
                processed_at = case when $2 = 'processed' then now() else processed_at end,
                last_error = $4
          where id = (select id from outbox_events where aggregate_type = 'message_effect'
                       and aggregate_id = $1 order by created_at desc limit 1)`,
        [input.effectId, input.status === "sent" ? "processed" : "failed", input.attemptNumber, errorText ?? null],
      );
      await writeAudit(client, {
        actorAccountId: current.rows[0].account_id ?? undefined,
        organizationId: current.rows[0].organization_id ?? undefined,
        action: `message.effect.${input.status}`,
        targetType: "message_effect",
        targetId: input.effectId,
        detail: { attemptNumber: input.attemptNumber, providerMessageIdPresent: Boolean(input.providerMessageId), ...(errorText ? { error: errorText } : {}) },
      });
      await client.query("commit");
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

export interface PlatformCrmTimelineEvent {
  id: string;
  subjectType: string;
  subjectId: string;
  subjectLabel?: string;
  accountEmail?: string;
  organizationId?: string;
  eventType: string;
  source: string;
  title: string;
  body?: string;
  actorAccountId?: string;
  createdAt?: string;
}

export interface PlatformAdminCrmData {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: { timelineEvents: number; notes: number; accountsWithActivity: number; organizationsWithActivity: number; latestAt?: string };
  rows: PlatformCrmTimelineEvent[];
}

interface CrmEventRow extends QueryResultRow {
  id: string;
  organization_id?: string | null;
  account_id?: string | null;
  event_type: string;
  source: string;
  title: string;
  body?: string | null;
  actor_account_id?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  account_email?: string | null;
  organization_name?: string | null;
  action?: string | null;
  created_at?: unknown;
}

function normalizeCrmEvent(row: CrmEventRow, compatibility = false): PlatformCrmTimelineEvent {
  const subjectType = row.organization_id ? "organization" : row.account_id ? "account" : row.target_type ?? "record";
  const subjectId = row.organization_id ?? row.account_id ?? row.target_id ?? row.id;
  return {
    id: row.id,
    subjectType,
    subjectId,
    ...(text(row.organization_name, 240) ? { subjectLabel: text(row.organization_name, 240) } : {}),
    ...(text(row.account_email, 320) ? { accountEmail: text(row.account_email, 320) } : {}),
    ...(row.organization_id ? { organizationId: row.organization_id } : {}),
    eventType: compatibility ? "audit" : row.event_type,
    source: compatibility ? "system-audit" : row.source,
    title: compatibility ? row.action ?? "Platform activity" : row.title,
    ...(text(row.body, 4_000) ? { body: text(row.body, 4_000) } : {}),
    ...(text(row.actor_account_id, 240) ? { actorAccountId: text(row.actor_account_id, 240) } : {}),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
  };
}

function emptyCrm(generatedAt: string, warnings: string[]): PlatformAdminCrmData {
  return { available: false, generatedAt, source: "platform_crm_timeline_events + audit_events", warnings, summary: { timelineEvents: 0, notes: 0, accountsWithActivity: 0, organizationsWithActivity: 0 }, rows: [] };
}

export async function readPlatformAdminCrm(
  connectionString: string,
  options: { limit?: number; organizationId?: string; accountId?: string } = {},
): Promise<PlatformAdminCrmData> {
  const generatedAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 250, 1), 500);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const availability = await tableAvailability(pool, ["platform_crm_timeline_events", "audit_events"]);
    if (!availability.get("platform_crm_timeline_events")) return emptyCrm(generatedAt, ["platform_crm_timeline_events is not deployed; CRM notes and timeline are unavailable."]);
    const timeline = await pool.query<CrmEventRow>(
      `select e.id, e.organization_id, e.account_id, e.event_type, e.source, e.title, e.body,
              e.actor_account_id, e.created_at, a.email as account_email, o.data->>'name' as organization_name
         from platform_crm_timeline_events e
         left join radar_accounts a on a.id = e.account_id
         left join radar_organizations o on o.id = e.organization_id
        where ($1::text is null or e.organization_id = $1)
          and ($2::text is null or e.account_id = $2)
        order by e.created_at desc limit $3`,
      [options.organizationId ?? null, options.accountId ?? null, limit],
    );
    const compatibility: PlatformCrmTimelineEvent[] = [];
    if (availability.get("audit_events")) {
      const audit = await pool.query<CrmEventRow>(
        `select e.id, e.organization_id, e.account_id, e.action, e.target_type, e.target_id,
                e.created_at, a.email as account_email, o.data->>'name' as organization_name
           from audit_events e
           left join radar_accounts a on a.id = e.account_id
           left join radar_organizations o on o.id = e.organization_id
          where (e.organization_id is not null or e.account_id is not null)
            and ($1::text is null or e.organization_id = $1)
            and ($2::text is null or e.account_id = $2)
          order by e.created_at desc limit $3`,
        [options.organizationId ?? null, options.accountId ?? null, limit],
      );
      compatibility.push(...audit.rows.map((row) => normalizeCrmEvent(row, true)));
    }
    const rows = [...timeline.rows.map((row) => normalizeCrmEvent(row)), ...compatibility]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, limit);
    const accountIds = new Set(rows.filter((row) => row.subjectType === "account").map((row) => row.subjectId));
    const organizationIds = new Set(rows.filter((row) => row.subjectType === "organization").map((row) => row.subjectId));
    return {
      available: true,
      generatedAt,
      source: "platform_crm_timeline_events + audit_events",
      warnings: [],
      summary: {
        timelineEvents: rows.length,
        notes: rows.filter((row) => row.eventType === "note").length,
        accountsWithActivity: accountIds.size,
        organizationsWithActivity: organizationIds.size,
        ...(rows[0]?.createdAt ? { latestAt: rows[0].createdAt } : {}),
      },
      rows,
    };
  } catch {
    return emptyCrm(generatedAt, ["CRM timeline could not be read; no customer activity is inferred from compatibility snapshots."]);
  } finally {
    await pool.end();
  }
}

export async function createPlatformCrmNote(input: {
  connectionString: string;
  actorAccountId: string;
  subjectType: "account" | "organization";
  subjectId: string;
  title: string;
  body: string;
  idempotencyKey: string;
}): Promise<{ status: "created" | "replayed"; idempotent: boolean; eventId: string }> {
  assertIdentifier(input.subjectId, "CRM subject id");
  assertIdempotencyKey(input.idempotencyKey);
  if (!input.title.trim() || input.title.length > 240) throw new Error("Invalid CRM note title");
  if (!input.body.trim() || input.body.length > 4_000) throw new Error("Invalid CRM note body");
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query(platformAdminFoundationsSchema);
    const availability = await tableAvailability(pool, ["platform_crm_timeline_events", "audit_events", "outbox_events"]);
    const missing = missingTables(availability, ["platform_crm_timeline_events", "audit_events", "outbox_events"]);
    if (missing.length > 0) throw new Error(`${missing.join(", ")} is not deployed`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
      const replay = await client.query<{ id: string }>("select id from platform_crm_timeline_events where idempotency_key = $1 for update", [input.idempotencyKey]);
      if (replay.rows[0]) {
        await client.query("commit");
        return { status: "replayed", idempotent: true, eventId: replay.rows[0].id };
      }
      const eventId = `crm_${randomUUID()}`;
      const organizationId = input.subjectType === "organization" ? input.subjectId : null;
      const accountId = input.subjectType === "account" ? input.subjectId : null;
      await client.query(
        `insert into platform_crm_timeline_events
           (id, organization_id, account_id, event_type, source, title, body, actor_account_id, idempotency_key)
         values ($1, $2, $3, 'note', 'operator', $4, $5, $6, $7)`,
        [eventId, organizationId, accountId, input.title.trim(), input.body.trim(), input.actorAccountId, input.idempotencyKey],
      );
      await writeAudit(client, { actorAccountId: input.actorAccountId, organizationId: organizationId ?? undefined, action: "crm.note.created", targetType: input.subjectType, targetId: input.subjectId, detail: { eventId, idempotencyKey: input.idempotencyKey, title: input.title.trim() } });
      await writeOutbox(client, { topic: "crm.timeline.created", aggregateType: input.subjectType, aggregateId: input.subjectId, payload: { eventId, eventType: "note", title: input.title.trim() } });
      await client.query("commit");
      return { status: "created", idempotent: false, eventId };
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

export type PlatformBillingEntryType = "subscription" | "invoice" | "payment" | "refund" | "dispute" | "connect" | "checkout" | "other";
export type PlatformBillingStatus = "received" | "processed" | "failed" | "ignored";

export interface PlatformBillingLedgerEntry {
  id: string;
  organizationId?: string;
  provider: string;
  providerEventId: string;
  providerObjectId?: string;
  eventType: string;
  entryType: string;
  status: string;
  amountCents?: number;
  currency?: string;
  occurredAt?: string;
  processedAt?: string;
  lastError?: string;
  createdAt?: string;
}

export interface PlatformAdminBillingData {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: { entries: number; processed: number; received: number; failed: number; ignored: number; grossAmountCents: number; byEntryType: Record<string, number> };
  rows: PlatformBillingLedgerEntry[];
}

interface BillingRow extends QueryResultRow {
  id: string;
  organization_id?: string | null;
  provider: string;
  provider_event_id: string;
  provider_object_id?: string | null;
  event_type: string;
  entry_type: string;
  status: string;
  amount_cents?: number | string | null;
  currency?: string | null;
  occurred_at?: unknown;
  processed_at?: unknown;
  last_error?: string | null;
  created_at?: unknown;
}

function normalizeBillingRow(row: BillingRow): PlatformBillingLedgerEntry {
  const amount = row.amount_cents === null || row.amount_cents === undefined ? undefined : numberValue(row.amount_cents);
  return {
    id: row.id,
    ...(text(row.organization_id, 240) ? { organizationId: text(row.organization_id, 240) } : {}),
    provider: row.provider,
    providerEventId: row.provider_event_id,
    ...(text(row.provider_object_id, 240) ? { providerObjectId: text(row.provider_object_id, 240) } : {}),
    eventType: row.event_type,
    entryType: row.entry_type,
    status: row.status,
    ...(amount !== undefined ? { amountCents: amount } : {}),
    ...(text(row.currency, 20) ? { currency: text(row.currency, 20) } : {}),
    ...(iso(row.occurred_at) ? { occurredAt: iso(row.occurred_at) } : {}),
    ...(iso(row.processed_at) ? { processedAt: iso(row.processed_at) } : {}),
    ...(safeError(row.last_error) ? { lastError: safeError(row.last_error) } : {}),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
  };
}

function billingEventType(eventType: string): PlatformBillingEntryType {
  if (eventType.includes("invoice")) return "invoice";
  if (eventType.includes("refund")) return "refund";
  if (eventType.includes("dispute")) return "dispute";
  if (eventType.includes("subscription")) return "subscription";
  if (eventType.includes("checkout")) return "checkout";
  if (eventType.startsWith("account.")) return "connect";
  if (eventType.includes("payment") || eventType.startsWith("charge.")) return "payment";
  return "other";
}

export { billingEventType };

function emptyBilling(generatedAt: string, warnings: string[]): PlatformAdminBillingData {
  return { available: false, generatedAt, source: "platform_billing_ledger", warnings, summary: { entries: 0, processed: 0, received: 0, failed: 0, ignored: 0, grossAmountCents: 0, byEntryType: {} }, rows: [] };
}

export async function readPlatformAdminBilling(
  connectionString: string,
  options: { limit?: number; organizationId?: string } = {},
): Promise<PlatformAdminBillingData> {
  const generatedAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 250, 1), 500);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    if (!(await tablePresent(pool, "platform_billing_ledger"))) return emptyBilling(generatedAt, ["platform_billing_ledger is not deployed; billing facts are unavailable."]);
    const [counts, entries] = await Promise.all([
      pool.query<{ status: string; count: number | string }>("select status, count(*)::int as count from platform_billing_ledger group by status"),
      pool.query<BillingRow>(
        `select id, organization_id, provider, provider_event_id, provider_object_id, event_type,
                entry_type, status, amount_cents, currency, occurred_at, processed_at, last_error, created_at
           from platform_billing_ledger
          where ($1::text is null or organization_id = $1)
          order by coalesce(occurred_at, created_at) desc limit $2`,
        [options.organizationId ?? null, limit],
      ),
    ]);
    const byStatus = Object.fromEntries(counts.rows.map((row) => [row.status, numberValue(row.count)]));
    const rows = entries.rows.map(normalizeBillingRow);
    const byEntryType: Record<string, number> = {};
    for (const row of rows) byEntryType[row.entryType] = (byEntryType[row.entryType] ?? 0) + 1;
    return {
      available: true,
      generatedAt,
      source: "platform_billing_ledger",
      warnings: [],
      summary: { entries: Object.values(byStatus).reduce((sum, count) => sum + count, 0), processed: byStatus.processed ?? 0, received: byStatus.received ?? 0, failed: byStatus.failed ?? 0, ignored: byStatus.ignored ?? 0, grossAmountCents: rows.filter((row) => row.status === "processed").reduce((sum, row) => sum + (row.amountCents ?? 0), 0), byEntryType },
      rows,
    };
  } catch {
    return emptyBilling(generatedAt, ["Billing ledger could not be read; plan fields are not treated as financial facts."]);
  } finally {
    await pool.end();
  }
}

export async function recordPlatformBillingEvent(input: {
  connectionString: string;
  providerEventId: string;
  eventType: string;
  entryType?: PlatformBillingEntryType;
  status: PlatformBillingStatus;
  organizationId?: string;
  provider?: string;
  providerObjectId?: string;
  amountCents?: number;
  currency?: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  occurredAt?: string;
  error?: string;
  metadata?: JsonRecord;
}): Promise<{ status: "recorded" | "replayed" | "updated"; id: string; currentStatus: PlatformBillingStatus }> {
  assertIdentifier(input.providerEventId, "provider event id");
  assertIdentifier(input.eventType, "billing event type");
  const provider = input.provider ?? "stripe";
  const entryType = input.entryType ?? billingEventType(input.eventType);
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query(platformAdminFoundationsSchema);
    const availability = await tableAvailability(pool, ["platform_billing_ledger", "audit_events", "outbox_events"]);
    const missing = missingTables(availability, ["platform_billing_ledger", "audit_events", "outbox_events"]);
    if (missing.length > 0) throw new Error(`${missing.join(", ")} is not deployed`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`${provider}:${input.providerEventId}:${entryType}`]);
      const existing = await client.query<{ id: string; status: PlatformBillingStatus }>(
        `select id, status from platform_billing_ledger
          where provider = $1 and provider_event_id = $2 and entry_type = $3 for update`,
        [provider, input.providerEventId, entryType],
      );
      const existingRow = existing.rows[0];
      const status = existingRow?.status === "processed" && input.status === "received" ? "processed" : input.status;
      const errorText = safeError(input.error);
      if (existingRow) {
        await client.query(
          `update platform_billing_ledger
              set status = $2, organization_id = coalesce($3, organization_id),
                  provider_object_id = coalesce($4, provider_object_id), amount_cents = coalesce($5, amount_cents),
                  currency = coalesce($6, currency), customer_id = coalesce($7, customer_id),
                  subscription_id = coalesce($8, subscription_id), invoice_id = coalesce($9, invoice_id),
                  occurred_at = coalesce($10, occurred_at), processed_at = case when $2 = 'processed' then now() else processed_at end,
                  last_error = $11, metadata = $12::jsonb, updated_at = now()
            where id = $1`,
          [existingRow.id, status, input.organizationId ?? null, input.providerObjectId ?? null, input.amountCents ?? null, input.currency ?? null, input.customerId ?? null, input.subscriptionId ?? null, input.invoiceId ?? null, input.occurredAt ?? null, errorText ?? null, json(input.metadata)],
        );
        if (existingRow.status !== status) {
          await writeAudit(client, { organizationId: input.organizationId, action: `billing.ledger.${status}`, targetType: "billing_entry", targetId: existingRow.id, detail: { provider, providerEventId: input.providerEventId, eventType: input.eventType, status } });
          await writeOutbox(client, { topic: "billing.ledger.updated", aggregateType: "billing_entry", aggregateId: existingRow.id, payload: { provider, eventType: input.eventType, status } });
        }
        await client.query("commit");
        return { status: existingRow.status === status ? "replayed" : "updated", id: existingRow.id, currentStatus: status };
      }
      const id = `bill_${randomUUID()}`;
      await client.query(
        `insert into platform_billing_ledger
           (id, organization_id, provider, provider_event_id, provider_object_id, event_type, entry_type,
            status, amount_cents, currency, customer_id, subscription_id, invoice_id, occurred_at, processed_at, last_error, metadata)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, case when $8 = 'processed' then now() else null end, $15, $16::jsonb)`,
        [id, input.organizationId ?? null, provider, input.providerEventId, input.providerObjectId ?? null, input.eventType, entryType, status, input.amountCents ?? null, input.currency ?? null, input.customerId ?? null, input.subscriptionId ?? null, input.invoiceId ?? null, input.occurredAt ?? null, errorText ?? null, json(input.metadata)],
      );
      await writeAudit(client, { organizationId: input.organizationId, action: "billing.ledger.recorded", targetType: "billing_entry", targetId: id, detail: { provider, providerEventId: input.providerEventId, eventType: input.eventType, entryType, status } });
      await writeOutbox(client, { topic: "billing.ledger.recorded", aggregateType: "billing_entry", aggregateId: id, payload: { provider, eventType: input.eventType, entryType, status } });
      await client.query("commit");
      return { status: "recorded", id, currentStatus: status };
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

export const PLATFORM_AGENT_CONTROL_ACTIONS = ["pause", "resume", "cancel", "replay", "requeue", "release-stale"] as const;
export type PlatformAgentControlAction = (typeof PLATFORM_AGENT_CONTROL_ACTIONS)[number];
export type PlatformAgentTargetType = "agent-run" | "handoff" | "review-job" | "enrichment-job";

const CONTROL_TARGET_TABLE: Record<PlatformAgentTargetType, string> = {
  "agent-run": "radar_agent_runs",
  handoff: "radar_agent_handoffs",
  "review-job": "radar_review_jobs",
  "enrichment-job": "radar_enrichment_jobs",
};
const CONTROL_ACTIONS: Record<PlatformAgentTargetType, readonly PlatformAgentControlAction[]> = {
  "agent-run": ["pause", "resume", "cancel", "replay"],
  handoff: ["cancel", "replay", "requeue"],
  "review-job": ["requeue", "release-stale", "replay"],
  "enrichment-job": ["requeue", "release-stale", "replay"],
};

export interface PlatformAgentControlRequest {
  id: string;
  operationId?: string;
  targetType: PlatformAgentTargetType | string;
  targetId: string;
  expectedState?: string;
  action: PlatformAgentControlAction | string;
  status: string;
  actorAccountId?: string;
  policyVersion?: string;
  reason?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformAdminAgentControlsData {
  available: boolean;
  generatedAt: string;
  source: string;
  warnings: string[];
  summary: { requests: number; requested: number; applied: number; failed: number; targets: number };
  requests: PlatformAgentControlRequest[];
}

interface ControlRow extends QueryResultRow {
  id: string;
  operation_id?: string;
  target_type: string;
  target_id: string;
  expected_state?: string | null;
  action: string;
  status: string;
  actor_account_id?: string | null;
  policy_version?: string | null;
  reason?: string | null;
  expires_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

function normalizeControl(row: ControlRow): PlatformAgentControlRequest {
  return {
    id: row.id,
    ...(text(row.operation_id, 240) ? { operationId: text(row.operation_id, 240) } : {}),
    targetType: row.target_type,
    targetId: row.target_id,
    ...(text(row.expected_state, 240) ? { expectedState: text(row.expected_state, 240) } : {}),
    action: row.action,
    status: row.status,
    ...(text(row.actor_account_id, 240) ? { actorAccountId: text(row.actor_account_id, 240) } : {}),
    ...(text(row.policy_version, 120) ? { policyVersion: text(row.policy_version, 120) } : {}),
    ...(text(row.reason, 1_000) ? { reason: text(row.reason, 1_000) } : {}),
    ...(iso(row.expires_at) ? { expiresAt: iso(row.expires_at) } : {}),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
  };
}

function emptyAgentControls(generatedAt: string, warnings: string[]): PlatformAdminAgentControlsData {
  return { available: false, generatedAt, source: "platform_agent_control_requests + agent graph tables", warnings, summary: { requests: 0, requested: 0, applied: 0, failed: 0, targets: 0 }, requests: [] };
}

export async function readPlatformAdminAgentControls(
  connectionString: string,
  options: { limit?: number } = {},
): Promise<PlatformAdminAgentControlsData> {
  const generatedAt = new Date().toISOString();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    const availability = await tableAvailability(pool, ["platform_agent_control_requests", ...Object.values(CONTROL_TARGET_TABLE)]);
    if (!availability.get("platform_agent_control_requests")) return emptyAgentControls(generatedAt, ["platform_agent_control_requests is not deployed; agent controls are unavailable."]);
    const warnings = Object.entries(CONTROL_TARGET_TABLE).filter(([, table]) => !availability.get(table)).map(([target, table]) => `${target} target table ${table} is not deployed; its controls are unavailable.`);
    const rows = await pool.query<ControlRow>(
      `select id, operation_id, target_type, target_id, expected_state, action, status, actor_account_id, policy_version, reason, expires_at, created_at, updated_at
         from platform_agent_control_requests order by created_at desc limit $1`,
      [limit],
    );
    const requests = rows.rows.map(normalizeControl);
    const counts: Record<string, number> = {};
    for (const row of requests) counts[row.status] = (counts[row.status] ?? 0) + 1;
    return { available: true, generatedAt, source: "platform_agent_control_requests + agent graph tables", warnings, summary: { requests: requests.length, requested: counts.requested ?? 0, applied: counts.applied ?? 0, failed: (counts.failed ?? 0) + (counts.rejected ?? 0), targets: new Set(requests.map((row) => `${row.targetType}:${row.targetId}`)).size }, requests };
  } catch {
    return emptyAgentControls(generatedAt, ["Agent control requests could not be read; the worker remains the only execution owner."]);
  } finally {
    await pool.end();
  }
}

export async function requestPlatformAgentControl(input: {
  connectionString: string;
  actorAccountId: string;
  targetType: PlatformAgentTargetType;
  targetId: string;
  action: PlatformAgentControlAction;
  idempotencyKey: string;
  reason?: string;
}): Promise<{ status: "requested" | "replayed"; idempotent: boolean; request: PlatformAgentControlRequest }> {
  assertIdentifier(input.targetId, "agent target id");
  assertIdempotencyKey(input.idempotencyKey);
  if (!CONTROL_TARGET_TABLE[input.targetType] || !CONTROL_ACTIONS[input.targetType].includes(input.action)) throw new Error("Unsupported agent control action");
  if (input.reason && input.reason.length > 1_000) throw new Error("Agent control reason is too long");
  const pool = new Pool({ connectionString: input.connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    await pool.query(platformAdminFoundationsSchema);
    const required = ["platform_agent_control_requests", "audit_events", "outbox_events", CONTROL_TARGET_TABLE[input.targetType]];
    const availability = await tableAvailability(pool, required);
    const missing = missingTables(availability, required);
    if (missing.length > 0) throw new Error(`${missing.join(", ")} is not deployed`);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
      const replay = await client.query<ControlRow>(
        `select id, operation_id, target_type, target_id, expected_state, action, status, actor_account_id, policy_version, reason, expires_at, created_at, updated_at
           from platform_agent_control_requests where idempotency_key = $1 for update`,
        [input.idempotencyKey],
      );
      if (replay.rows[0]) {
        await client.query("commit");
        return { status: "replayed", idempotent: true, request: normalizeControl(replay.rows[0]) };
      }
      const target = await client.query<{ status: string }>(`select status from ${CONTROL_TARGET_TABLE[input.targetType]} where id = $1`, [input.targetId]);
      if (!target.rows[0]) {
        const error = new Error("Agent target not found");
        error.name = "NotFoundError";
        throw error;
      }
      const id = `agent_control_${randomUUID()}`;
      await client.query(
        `insert into platform_agent_control_requests
           (id, operation_id, target_type, target_id, expected_state, action, status, actor_account_id, idempotency_key, policy_version, reason, expires_at)
         values ($1, $1, $2, $3, $4, $5, 'requested', $6, $7, 'agent-control.v1', $8, now() + interval '30 minutes')`,
        [id, input.targetType, input.targetId, target.rows[0].status, input.action, input.actorAccountId, input.idempotencyKey, input.reason?.trim() || null],
      );
      await writeAudit(client, { actorAccountId: input.actorAccountId, action: "agent.control.requested", targetType: input.targetType, targetId: input.targetId, detail: { requestId: id, action: input.action, idempotencyKey: input.idempotencyKey } });
      await writeOutbox(client, { topic: "agent.control.requested", aggregateType: input.targetType, aggregateId: input.targetId, payload: { requestId: id, action: input.action, targetType: input.targetType } });
      await client.query("commit");
      return { status: "requested", idempotent: false, request: { id, operationId: id, targetType: input.targetType, targetId: input.targetId, action: input.action, status: "requested", actorAccountId: input.actorAccountId, policyVersion: "agent-control.v1", expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), ...(input.reason ? { reason: input.reason.trim() } : {}) } };
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

export interface PlatformAgentControlProcessingResult {
  processed: number;
  applied: number;
  rejected: number;
}

/**
 * Worker-side acknowledgement for the control-intent queue. This is the only
 * place that may mutate worker-owned queue projections. Unsupported lifecycle
 * operations remain rejected until the corresponding worker cooperative-stop
 * contract exists; an admin request is never treated as execution evidence.
 */
export async function processPlatformAgentControlRequests(
  connectionString: string,
  limit = 25,
): Promise<PlatformAgentControlProcessingResult> {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  const result: PlatformAgentControlProcessingResult = { processed: 0, applied: 0, rejected: 0 };
  try {
    const availability = await tableAvailability(pool, ["platform_agent_control_requests", "audit_events", "outbox_events", ...Object.values(CONTROL_TARGET_TABLE)]);
    const required = ["platform_agent_control_requests", "audit_events", "outbox_events"];
    if (missingTables(availability, required).length > 0) return result;
    const client = await pool.connect();
    try {
      await client.query("begin");
      const pending = await client.query<ControlRow & { reason?: string | null }>(
        `select id, operation_id, target_type, target_id, expected_state, action, status, actor_account_id, policy_version, reason, expires_at, created_at, updated_at
           from platform_agent_control_requests where status = 'requested'
          order by created_at asc limit $1 for update skip locked`,
        [Math.min(Math.max(limit, 1), 100)],
      );
      for (const request of pending.rows) {
        result.processed += 1;
        const targetType = request.target_type as PlatformAgentTargetType;
        const table = CONTROL_TARGET_TABLE[targetType];
        let outcome: "applied" | "rejected" = "rejected";
        let reason = "The worker does not support this control action yet.";
        if (table && availability.get(table) && CONTROL_ACTIONS[targetType]?.includes(request.action as PlatformAgentControlAction)) {
          const target = targetType === "handoff" || targetType === "agent-run"
            ? await client.query<{ status: string; lease_until?: unknown }>(`select status from ${table} where id = $1 for update`, [request.target_id])
            : await client.query<{ status: string; lease_until?: unknown }>(`select status, lease_until from ${table} where id = $1 for update`, [request.target_id]);
          const current = target.rows[0];
          const leaseExpired = !current?.lease_until || (current.lease_until instanceof Date ? current.lease_until.getTime() < Date.now() : Date.parse(String(current?.lease_until)) < Date.now());
          const action = request.action as PlatformAgentControlAction;
          if (current && request.expected_state && current.status !== request.expected_state) {
            reason = `Expected state ${request.expected_state} no longer matches current state ${current.status}.`;
          } else if (current && (targetType === "review-job" || targetType === "enrichment-job") && (action === "requeue" || action === "replay" || (action === "release-stale" && current.status === "processing" && leaseExpired))) {
            if (current.status === "completed" || current.status === "needs-human") {
              reason = `A ${current.status} job cannot be requeued by this contract.`;
            } else if (action === "release-stale" && current.status !== "processing") {
              reason = `Release-stale requires a processing job; current state is ${current.status}.`;
            } else if (action !== "release-stale" && current.status === "processing" && !leaseExpired) {
              reason = "The job lease is still active; the worker will not take it over.";
            } else {
              await client.query(
                `update ${table} set status = 'queued', lease_until = null, next_attempt_at = now(), last_error = null, updated_at = now() where id = $1`,
                [request.target_id],
              );
              outcome = "applied";
              reason = "The worker requeued the job after validating its current state.";
            }
          } else if (current && targetType === "handoff" && (action === "requeue" || action === "replay") && ["failed", "blocked"].includes(current.status)) {
            await client.query("update radar_agent_handoffs set status = 'queued', completed_at = null where id = $1", [request.target_id]);
            outcome = "applied";
            reason = "The worker requeued the handoff after validating its terminal state.";
          } else if (current && targetType === "agent-run") {
            reason = "Run pause, resume, cancel, and replay require a cooperative worker lifecycle contract; the request was not applied.";
          } else if (!current) {
            reason = "The worker target no longer exists.";
          }
        } else if (!table || !availability.get(table)) {
          reason = "The target lane is not deployed in this environment.";
        }
        await client.query(
          `update platform_agent_control_requests
              set status = $2, reason = $3, applied_at = case when $2 = 'applied' then now() else applied_at end, updated_at = now()
            where id = $1`,
          [request.id, outcome, reason],
        );
        await writeAudit(client, { actorAccountId: request.actor_account_id ?? undefined, action: `agent.control.${outcome}`, targetType: request.target_type, targetId: request.target_id, detail: { requestId: request.id, action: request.action, reason } });
        await writeOutbox(client, { topic: "agent.control.acknowledged", aggregateType: request.target_type, aggregateId: request.target_id, payload: { requestId: request.id, action: request.action, status: outcome, reason } });
        if (outcome === "applied") result.applied += 1;
        else result.rejected += 1;
      }
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return result;
  } finally {
    await pool.end();
  }
}
