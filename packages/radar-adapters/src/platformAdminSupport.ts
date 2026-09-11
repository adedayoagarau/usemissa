import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";

export const PLATFORM_SUPPORT_STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "dismissed",
] as const;

export type PlatformSupportStatus = (typeof PLATFORM_SUPPORT_STATUSES)[number];

export interface PlatformAdminSupportCase {
  id: string;
  accountId: string;
  accountEmail?: string;
  opportunityId: string;
  subjectType?: string;
  subjectId?: string;
  opportunityTitle?: string;
  opportunitySlug?: string;
  reason: string;
  note?: string;
  correction?: string;
  evidenceUrl?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformAdminSupportSummary {
  total: number;
  byStatus: Record<string, number>;
}

export interface PlatformAdminSupportQueue {
  available: boolean;
  generatedAt: string;
  source: "opportunity_issue_reports";
  warnings: string[];
  summary: PlatformAdminSupportSummary;
  rows: PlatformAdminSupportCase[];
}

export interface CreateOpportunityIssueReportInput {
  accountId: string;
  opportunityId: string;
  reason: string;
  note?: string;
  idempotencyKey: string;
}

export interface CreateOpportunityIssueReportResult {
  status: "created" | "replayed";
  idempotent: boolean;
  report: PlatformAdminSupportCase;
}

export interface UpdatePlatformAdminSupportCaseInput {
  caseId: string;
  status: PlatformSupportStatus;
  actorAccountId: string;
  idempotencyKey: string;
  correction?: string;
  evidenceUrl?: string;
  correctedField?: string;
  correctedValue?: string;
}

export interface UpdatePlatformAdminSupportCaseResult {
  status: "updated" | "replayed";
  idempotent: boolean;
  changed: boolean;
  caseId: string;
  previousStatus: string;
  currentStatus: string;
}

interface SupportCaseRow {
  id: string;
  account_id: string;
  account_email?: string | null;
  opportunity_id: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
  opportunity_title?: string | null;
  opportunity_slug?: string | null;
  reason: string;
  note?: string | null;
  correction?: string | null;
  evidence_url?: string | null;
  status: string;
  created_at?: unknown;
  updated_at?: unknown;
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return undefined;
}

function text(value: unknown, max = 2_000): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return value.slice(0, max);
}

function canonicalStatus(value: string): string {
  return value === "in_progress" ? "in-progress" : value;
}

function assertSupportStatus(value: string): asserts value is PlatformSupportStatus {
  if (!PLATFORM_SUPPORT_STATUSES.includes(value as PlatformSupportStatus)) {
    throw new Error("Invalid support case status");
  }
}

export function normalizePlatformAdminSupportCase(row: SupportCaseRow): PlatformAdminSupportCase {
  return {
    id: row.id,
    accountId: row.account_id,
    ...(text(row.account_email, 320) ? { accountEmail: text(row.account_email, 320) } : {}),
    opportunityId: row.opportunity_id ?? row.subject_id ?? "",
    ...(text(row.subject_type, 40) ? { subjectType: text(row.subject_type, 40) } : {}),
    ...(text(row.subject_id, 200) ? { subjectId: text(row.subject_id, 200) } : {}),
    ...(text(row.opportunity_title, 500) ? { opportunityTitle: text(row.opportunity_title, 500) } : {}),
    ...(text(row.opportunity_slug, 200) ? { opportunitySlug: text(row.opportunity_slug, 200) } : {}),
    reason: row.reason,
    ...(text(row.note) ? { note: text(row.note) } : {}),
    ...(text(row.correction) ? { correction: text(row.correction, 2_000) } : {}),
    ...(text(row.evidence_url, 1_000) ? { evidenceUrl: text(row.evidence_url, 1_000) } : {}),
    status: canonicalStatus(row.status),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
  };
}

export function summarizePlatformAdminSupportCases(rows: PlatformAdminSupportCase[]): PlatformAdminSupportSummary {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const status = canonicalStatus(row.status);
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

function emptyQueue(generatedAt: string, warnings: string[]): PlatformAdminSupportQueue {
  return {
    available: false,
    generatedAt,
    source: "opportunity_issue_reports",
    warnings,
    summary: { total: 0, byStatus: {} },
    rows: [],
  };
}

async function tablePresent(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    "select to_regclass('public.' || $1) is not null as present",
    [table],
  );
  return result.rows[0]?.present === true;
}

function assertIdempotencyKey(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Invalid idempotency key");
  }
}

function assertCaseId(value: string): void {
  if (!value || value.length > 200 || !/^[A-Za-z0-9_:.-]+$/.test(value)) {
    throw new Error("Invalid support case id");
  }
}

function assertEvidenceUrl(value: string | undefined): void {
  if (value === undefined) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    throw new Error("Evidence URL must use http or https");
  }
}

const CORRECTABLE_FIELDS = new Set(["title", "status", "deadline_date", "fee_status", "fee_cents", "location", "guidelines_url", "submission_url"]);

async function writeAudit(
  client: PoolClient,
  actorAccountId: string,
  action: string,
  targetId: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `insert into audit_events (account_id, action, target_type, target_id, detail)
     values ($1, $2, 'opportunity_issue_report', $3, $4::jsonb)`,
    [actorAccountId, action, targetId, JSON.stringify(detail)],
  );
}

async function writeOutbox(
  client: PoolClient,
  topic: string,
  reportId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `insert into outbox_events (topic, aggregate_type, aggregate_id, payload)
     values ($1, 'opportunity_issue_report', $2, $3::jsonb)`,
    [topic, reportId, JSON.stringify(payload)],
  );
}

export async function readPlatformAdminSupportQueue(
  connectionString: string,
  options: { limit?: number } = {},
): Promise<PlatformAdminSupportQueue> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  try {
    if (!(await tablePresent(pool, "opportunity_issue_reports"))) {
      return emptyQueue(generatedAt, ["opportunity_issue_reports is not deployed; support cases are unavailable."]);
    }

    const warnings: string[] = [];
    const [counts, rows] = await Promise.all([
      pool.query<{ status: string; count: number | string }>(
        "select status, count(*)::int as count from opportunity_issue_reports group by status",
      ),
      pool.query<SupportCaseRow>(
        `select r.id, r.account_id, a.email as account_email, r.opportunity_id,
                r.subject_type, r.subject_id, r.correction, r.evidence_url,
                o.title as opportunity_title, o.slug as opportunity_slug,
                r.reason, r.note, r.status, r.created_at, r.updated_at
           from opportunity_issue_reports r
           left join radar_accounts a on a.id = r.account_id
           left join opportunities o on o.id = r.opportunity_id
          order by case when r.status in ('open', 'in-progress', 'in_progress') then 0 else 1 end,
                   r.created_at desc
          limit $1`,
        [limit],
      ),
    ]).catch((error: unknown) => {
      warnings.push(error instanceof Error ? "Support case read failed; no rows are shown." : "Support case read failed; no rows are shown.");
      return [undefined, undefined] as const;
    });

    if (!counts || !rows) return { ...emptyQueue(generatedAt, warnings), available: true };
    const normalized = rows.rows.map(normalizePlatformAdminSupportCase);
    const byStatus = Object.fromEntries(
      counts.rows.map((row) => [canonicalStatus(row.status), Number(row.count ?? 0)]),
    );
    return {
      available: true,
      generatedAt,
      source: "opportunity_issue_reports",
      warnings,
      summary: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
      },
      rows: normalized,
    };
  } catch {
    return emptyQueue(generatedAt, ["Support cases could not be read; the database-backed support surface is unavailable."]);
  } finally {
    await pool.end();
  }
}

export async function createOpportunityIssueReport(
  connectionString: string,
  input: CreateOpportunityIssueReportInput,
): Promise<CreateOpportunityIssueReportResult> {
  assertIdempotencyKey(input.idempotencyKey);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    for (const table of ["opportunity_issue_reports", "audit_events", "outbox_events"]) {
      if (!(await tablePresent(pool, table))) throw new Error(`${table} is not deployed`);
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const replay = await client.query<SupportCaseRow>(
        `select id, account_id, opportunity_id, subject_type, subject_id, correction, evidence_url, reason, note, status, created_at, updated_at
           from opportunity_issue_reports
          where idempotency_key = $1
          for update`,
        [input.idempotencyKey],
      );
      if (replay.rows[0]) {
        if (replay.rows[0].account_id !== input.accountId) {
          const error = new Error("Idempotency key belongs to another account");
          error.name = "ConflictError";
          throw error;
        }
        await client.query("commit");
        return { status: "replayed", idempotent: true, report: normalizePlatformAdminSupportCase(replay.rows[0]) };
      }

      const opportunity = await client.query<{ id: string }>("select id from opportunities where id = $1", [input.opportunityId]);
      if (!opportunity.rows[0]) {
        await client.query("rollback");
        const error = new Error("Opportunity not found");
        error.name = "NotFoundError";
        throw error;
      }
      const id = `issue_${randomUUID()}`;
      const inserted = await client.query<SupportCaseRow>(
        `insert into opportunity_issue_reports
           (id, account_id, opportunity_id, reason, note, status, idempotency_key)
         values ($1, $2, $3, $4, $5, 'open', $6)
         returning id, account_id, opportunity_id, reason, note, status, created_at, updated_at`,
        [id, input.accountId, input.opportunityId, input.reason, input.note ?? null, input.idempotencyKey],
      );
      const report = normalizePlatformAdminSupportCase(inserted.rows[0]);
      await writeAudit(client, input.accountId, "opportunity.issue_reported", report.id, {
        opportunityId: report.opportunityId,
        reason: report.reason,
        idempotencyKey: input.idempotencyKey,
      });
      await writeOutbox(client, "support.issue_reported", report.id, {
        opportunityId: report.opportunityId,
        reason: report.reason,
        status: report.status,
      });
      await client.query("commit");
      return { status: "created", idempotent: false, report };
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

export async function updatePlatformAdminSupportCase(
  connectionString: string,
  input: UpdatePlatformAdminSupportCaseInput,
): Promise<UpdatePlatformAdminSupportCaseResult> {
  assertCaseId(input.caseId);
  assertIdempotencyKey(input.idempotencyKey);
  assertSupportStatus(input.status);
  const correction = input.correction?.trim();
  const evidenceUrl = input.evidenceUrl?.trim();
  const correctedField = input.correctedField?.trim();
  const correctedValue = input.correctedValue?.trim();
  if (correctedField && !CORRECTABLE_FIELDS.has(correctedField)) throw new Error("That correction field is not supported");
  if (correctedField && !correctedValue) throw new Error("A correction value is required");
  if (input.status === "resolved" && (!correction || !evidenceUrl)) throw new Error("A resolved correction requires the verified detail and official source URL");
  if (evidenceUrl) assertEvidenceUrl(evidenceUrl);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 3_000 });
  try {
    for (const table of ["opportunity_issue_reports", "audit_events", "outbox_events"]) {
      if (!(await tablePresent(pool, table))) throw new Error(`${table} is not deployed`);
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const replay = await client.query<{ detail: Record<string, unknown> | null }>(
        `select detail from audit_events
          where account_id = $1 and action = 'platform_admin.support_case_status_updated'
            and target_type = 'opportunity_issue_report' and target_id = $2
            and detail->>'idempotencyKey' = $3
          order by created_at desc limit 1`,
        [input.actorAccountId, input.caseId, input.idempotencyKey],
      );
      const replayDetail = replay.rows[0]?.detail;
      if (replayDetail && typeof replayDetail.previousStatus === "string" && typeof replayDetail.status === "string") {
        await client.query("commit");
        return {
          status: "replayed",
          idempotent: true,
          changed: replayDetail.previousStatus !== replayDetail.status,
          caseId: input.caseId,
          previousStatus: replayDetail.previousStatus,
          currentStatus: replayDetail.status,
        };
      }

      const current = await client.query<{ status: string; opportunity_id: string | null; subject_type: string; subject_id: string; correction: string | null; evidence_url: string | null }>(
        "select status, opportunity_id, subject_type, subject_id, correction, evidence_url from opportunity_issue_reports where id = $1 for update",
        [input.caseId],
      );
      if (!current.rows[0]) {
        await client.query("rollback");
        const error = new Error("Support case not found");
        error.name = "NotFoundError";
        throw error;
      }
      const previousStatus = canonicalStatus(current.rows[0].status);
      const verifiedCorrection = correction ?? current.rows[0].correction ?? null;
      const verifiedEvidence = evidenceUrl ?? current.rows[0].evidence_url ?? null;
      if (correctedField && correctedValue && current.rows[0].opportunity_id) {
        const value: string | number = correctedField === "fee_cents" ? Number(correctedValue) : correctedValue;
        if (correctedField === "fee_cents" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) throw new Error("Fee correction must be a non-negative whole number");
        const previous = await client.query<{ value: string | null }>(`select ${correctedField}::text as value from opportunities where id=$1 for update`, [current.rows[0].opportunity_id]);
        if (!previous.rows[0]) throw new Error("Opportunity not found");
        await client.query(`update opportunities set ${correctedField}=$1, updated_at=now(), last_changed_at=now() where id=$2`, [value, current.rows[0].opportunity_id]);
        await client.query(`insert into opportunity_changes (id,opportunity_id,kind,field,old_value,new_value,created_at) values($1,$2,'verified-correction',$3,$4,$5,now())`, [randomUUID(), current.rows[0].opportunity_id, correctedField, previous.rows[0].value, String(value)]);
      }
      await client.query(
        "update opportunity_issue_reports set status = $2, correction = coalesce($3, correction), evidence_url = coalesce($4, evidence_url), updated_at = now() where id = $1",
        [input.caseId, input.status, verifiedCorrection, verifiedEvidence],
      );
      if (input.status === "resolved" && previousStatus !== "resolved" && current.rows[0].opportunity_id) {
        const tracked = await client.query<{ account_id: string; title: string }>(
          `select t.account_id, coalesce(o.title, 'Tracked opportunity') as title
             from tracked_opportunities t join opportunities o on o.id=t.opportunity_id
            where t.opportunity_id=$1`,
          [current.rows[0].opportunity_id],
        );
        for (const row of tracked.rows) {
          await client.query(
            `insert into creator_inbox_alerts
             (id,account_id,opportunity_id,kind,title,body,reason,dedupe_key,delivery_eligibility,action_href)
             select $1,$2,$3,'opportunity-correction',$4,$5,$6,$7,'in-app',$8
             where coalesce((select in_app_enabled from notification_preferences where account_id=$2),true)
             on conflict do nothing`,
            [
              randomUUID(), row.account_id, current.rows[0].opportunity_id,
              `Updated information for ${row.title}`,
              verifiedCorrection ?? "Missa reviewed and corrected information from the official source.",
              verifiedEvidence ? `Source: ${verifiedEvidence}` : "Source-backed correction reviewed by Missa.",
              `opportunity-correction:${input.caseId}:${row.account_id}`,
              `/opportunities/${encodeURIComponent(current.rows[0].opportunity_id)}`,
            ],
          );
        }
      }
      await writeAudit(client, input.actorAccountId, "platform_admin.support_case_status_updated", input.caseId, {
        idempotencyKey: input.idempotencyKey,
        previousStatus,
        status: input.status,
      });
      await writeOutbox(client, "support.issue_status_changed", input.caseId, {
        previousStatus,
        status: input.status,
      });
      await client.query("commit");
      return {
        status: "updated",
        idempotent: false,
        changed: previousStatus !== input.status,
        caseId: input.caseId,
        previousStatus,
        currentStatus: input.status,
      };
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
