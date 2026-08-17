import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export const PROFILE_ISSUE_REASONS = [
  "impersonation",
  "rights",
  "abusive-content",
  "spam",
  "other",
] as const;

export type ProfileIssueReason = (typeof PROFILE_ISSUE_REASONS)[number];

export interface CreateProfileIssueReportInput {
  profileUserId: string;
  reporterAccountId?: string;
  reason: ProfileIssueReason;
  note?: string;
  idempotencyKey: string;
}

export interface CreateProfileIssueReportResult {
  status: "created" | "replayed";
  idempotent: boolean;
  reportId: string;
}

export interface ProfileIssueReportCase {
  id: string;
  kind: "profile";
  profileUserId: string;
  profileDisplayName?: string;
  reporterAccountId?: string;
  reporterEmail?: string;
  reason: ProfileIssueReason;
  note?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileIssueReportQueue {
  available: boolean;
  generatedAt: string;
  warnings: string[];
  summary: { total: number; byStatus: Record<string, number> };
  rows: ProfileIssueReportCase[];
}

export interface UpdateProfileIssueReportInput {
  reportId: string;
  status: "open" | "in-progress" | "resolved" | "dismissed";
  actorAccountId: string;
  idempotencyKey: string;
}

function assertId(value: string, label: string): void {
  if (!value || value.length > 200 || !/^[A-Za-z0-9_:.-]+$/u.test(value))
    throw new Error(`Invalid ${label}`);
}

function assertIdempotencyKey(value: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  )
    throw new Error("Invalid idempotency key");
}

async function tablePresent(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query<{ present: boolean }>(
    "select to_regclass('public.' || $1) is not null as present",
    [table],
  );
  return result.rows[0]?.present === true;
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value ? value : undefined;
}

function canonicalStatus(value: string): string {
  return value === "in_progress" ? "in-progress" : value;
}

interface ProfileIssueReportRow {
  id: string;
  profile_user_id: string;
  profile_display_name?: string | null;
  reporter_account_id?: string | null;
  reporter_email?: string | null;
  reason: ProfileIssueReason;
  note?: string | null;
  status: string;
  created_at?: unknown;
  updated_at?: unknown;
}

function normalizeProfileIssueReport(
  row: ProfileIssueReportRow,
): ProfileIssueReportCase {
  return {
    id: row.id,
    kind: "profile",
    profileUserId: row.profile_user_id,
    ...(row.profile_display_name
      ? { profileDisplayName: row.profile_display_name.slice(0, 500) }
      : {}),
    ...(row.reporter_account_id
      ? { reporterAccountId: row.reporter_account_id }
      : {}),
    ...(row.reporter_email
      ? { reporterEmail: row.reporter_email.slice(0, 320) }
      : {}),
    reason: row.reason,
    ...(row.note ? { note: row.note.slice(0, 2_000) } : {}),
    status: canonicalStatus(row.status),
    ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {}),
    ...(iso(row.updated_at) ? { updatedAt: iso(row.updated_at) } : {}),
  };
}

export async function readProfileIssueReportQueue(
  connectionString: string,
  options: { limit?: number } = {},
): Promise<ProfileIssueReportQueue> {
  const generatedAt = new Date().toISOString();
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 3_000,
  });
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const unavailable = (warnings: string[]): ProfileIssueReportQueue => ({
    available: false,
    generatedAt,
    warnings,
    summary: { total: 0, byStatus: {} },
    rows: [],
  });
  try {
    if (!(await tablePresent(pool, "profile_issue_reports")))
      return unavailable([
        "profile_issue_reports is not deployed; Profile reports are unavailable.",
      ]);
    const [counts, rows] = await Promise.all([
      pool.query<{ status: string; count: number | string }>(
        "select status, count(*)::int as count from profile_issue_reports group by status",
      ),
      pool.query<ProfileIssueReportRow>(
        `select r.id, r.profile_user_id,
                u.data->>'displayName' as profile_display_name,
                r.reporter_account_id, a.email as reporter_email,
                r.reason, r.note, r.status, r.created_at, r.updated_at
           from profile_issue_reports r
           left join radar_users u on u.id = r.profile_user_id
           left join radar_accounts a on a.id = r.reporter_account_id
          order by case when r.status in ('open', 'in-progress', 'in_progress') then 0 else 1 end,
                   r.created_at desc
          limit $1`,
        [limit],
      ),
    ]);
    const byStatus = Object.fromEntries(
      counts.rows.map((row) => [
        canonicalStatus(row.status),
        Number(row.count ?? 0),
      ]),
    );
    return {
      available: true,
      generatedAt,
      warnings: [],
      summary: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
      },
      rows: rows.rows.map(normalizeProfileIssueReport),
    };
  } catch {
    return unavailable(["Profile reports could not be read."]);
  } finally {
    await pool.end();
  }
}

export async function updateProfileIssueReport(
  connectionString: string,
  input: UpdateProfileIssueReportInput,
): Promise<{
  status: "updated" | "replayed";
  idempotent: boolean;
  previousStatus: string;
  currentStatus: string;
}> {
  assertId(input.reportId, "Profile report id");
  assertId(input.actorAccountId, "account id");
  assertIdempotencyKey(input.idempotencyKey);
  if (!["open", "in-progress", "resolved", "dismissed"].includes(input.status))
    throw new Error("Invalid support case status");
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 3_000,
  });
  try {
    for (const table of [
      "profile_issue_reports",
      "audit_events",
      "outbox_events",
    ]) {
      if (!(await tablePresent(pool, table)))
        throw new Error(`${table} is not deployed`);
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const replay = await client.query<{
        detail: Record<string, unknown> | null;
      }>(
        `select detail from audit_events
          where account_id = $1
            and action = 'platform_admin.profile_report_status_updated'
            and target_type = 'profile_issue_report' and target_id = $2
            and detail->>'idempotencyKey' = $3
          order by created_at desc limit 1`,
        [input.actorAccountId, input.reportId, input.idempotencyKey],
      );
      const detail = replay.rows[0]?.detail;
      if (
        detail &&
        typeof detail.previousStatus === "string" &&
        typeof detail.status === "string"
      ) {
        await client.query("commit");
        return {
          status: "replayed",
          idempotent: true,
          previousStatus: detail.previousStatus,
          currentStatus: detail.status,
        };
      }
      const current = await client.query<{ status: string }>(
        "select status from profile_issue_reports where id = $1 for update",
        [input.reportId],
      );
      if (!current.rows[0]) {
        const notFound = new Error("Support case not found");
        notFound.name = "NotFoundError";
        throw notFound;
      }
      const previousStatus = canonicalStatus(current.rows[0].status);
      await client.query(
        "update profile_issue_reports set status = $2, updated_at = now() where id = $1",
        [input.reportId, input.status],
      );
      await client.query(
        `insert into audit_events
          (account_id, action, target_type, target_id, detail)
         values ($1, 'platform_admin.profile_report_status_updated', 'profile_issue_report', $2, $3::jsonb)`,
        [
          input.actorAccountId,
          input.reportId,
          JSON.stringify({
            idempotencyKey: input.idempotencyKey,
            previousStatus,
            status: input.status,
          }),
        ],
      );
      await client.query(
        `insert into outbox_events
          (topic, aggregate_type, aggregate_id, payload)
         values ('support.profile_report_status_changed', 'profile_issue_report', $1, $2::jsonb)`,
        [
          input.reportId,
          JSON.stringify({ previousStatus, status: input.status }),
        ],
      );
      await client.query("commit");
      return {
        status: "updated",
        idempotent: false,
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

export async function createProfileIssueReport(
  connectionString: string,
  input: CreateProfileIssueReportInput,
): Promise<CreateProfileIssueReportResult> {
  assertId(input.profileUserId, "Profile id");
  if (input.reporterAccountId) assertId(input.reporterAccountId, "account id");
  assertIdempotencyKey(input.idempotencyKey);
  if (!PROFILE_ISSUE_REASONS.includes(input.reason))
    throw new Error("Invalid Profile issue reason");
  const note = input.note?.trim();
  if (note && note.length > 2_000) throw new Error("Report note is too long");

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 3_000,
  });
  try {
    for (const table of [
      "profile_issue_reports",
      "audit_events",
      "outbox_events",
    ]) {
      if (!(await tablePresent(pool, table)))
        throw new Error(`${table} is not deployed`);
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      const replay = await client.query<{
        id: string;
        profile_user_id: string;
      }>(
        `select id, profile_user_id from profile_issue_reports
          where idempotency_key = $1 for update`,
        [input.idempotencyKey],
      );
      if (replay.rows[0]) {
        if (replay.rows[0].profile_user_id !== input.profileUserId) {
          const conflict = new Error(
            "Idempotency key belongs to another Profile report",
          );
          conflict.name = "ConflictError";
          throw conflict;
        }
        await client.query("commit");
        return {
          status: "replayed",
          idempotent: true,
          reportId: replay.rows[0].id,
        };
      }

      const reportId = `profile_issue_${randomUUID()}`;
      await client.query(
        `insert into profile_issue_reports
          (id, profile_user_id, reporter_account_id, reason, note, status, idempotency_key)
         values ($1, $2, $3, $4, $5, 'open', $6)`,
        [
          reportId,
          input.profileUserId,
          input.reporterAccountId ?? null,
          input.reason,
          note || null,
          input.idempotencyKey,
        ],
      );
      await client.query(
        `insert into audit_events
          (account_id, action, target_type, target_id, detail)
         values ($1, 'profile.issue_reported', 'profile_issue_report', $2, $3::jsonb)`,
        [
          input.reporterAccountId ?? null,
          reportId,
          JSON.stringify({
            profileUserId: input.profileUserId,
            reason: input.reason,
          }),
        ],
      );
      await client.query(
        `insert into outbox_events
          (topic, aggregate_type, aggregate_id, payload)
         values ('support.profile_reported', 'profile_issue_report', $1, $2::jsonb)`,
        [
          reportId,
          JSON.stringify({
            profileUserId: input.profileUserId,
            reason: input.reason,
            status: "open",
          }),
        ],
      );
      await client.query("commit");
      return { status: "created", idempotent: false, reportId };
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
