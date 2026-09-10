import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSessionAccount } from "@/lib/auth";

export const runtime = "nodejs";

const headers = { "cache-control": "private, no-store" };
const SUBJECT_TYPES = new Set(["opportunity", "journal"]);
const ISSUE_TYPES = new Set([
  "deadline-or-status",
  "fee-or-eligibility",
  "broken-official-link",
  "ranking-data",
  "duplicate-record",
  "other",
]);

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return;
  const result = value.trim();
  return result ? result.slice(0, max) : undefined;
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.id)
    return NextResponse.json({ error: "Log in to send a correction." }, { status: 401, headers });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "The correction queue is unavailable." }, { status: 503, headers });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const subjectType = clean(body?.subjectType, 40);
  const subjectId = clean(body?.subjectId, 200);
  const subjectPath = clean(body?.subjectPath, 500);
  const issueType = clean(body?.issueType, 80);
  const correction = clean(body?.correction, 2_000);
  const evidenceUrl = clean(body?.evidenceUrl, 1_000);
  const idempotencyKey = clean(body?.idempotencyKey, 80);

  if (!subjectType || !SUBJECT_TYPES.has(subjectType) || !subjectId || !issueType || !ISSUE_TYPES.has(issueType))
    return NextResponse.json({ error: "Choose what needs correcting." }, { status: 400, headers });
  if (!correction)
    return NextResponse.json({ error: "Tell us what the correct information should be." }, { status: 400, headers });
  if (!idempotencyKey || !/^[0-9a-f-]{36}$/iu.test(idempotencyKey))
    return NextResponse.json({ error: "The report could not be identified." }, { status: 400, headers });
  if (evidenceUrl) {
    try {
      const url = new URL(evidenceUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      return NextResponse.json({ error: "Enter a valid supporting URL." }, { status: 400, headers });
    }
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 3_000 });
  const client = await pool.connect().catch(() => null);
  if (!client) {
    await pool.end();
    return NextResponse.json({ error: "The correction queue is unavailable." }, { status: 503, headers });
  }
  try {
    await client.query("begin");
    const replay = await client.query<{ id: string }>(
      "select id from opportunity_issue_reports where idempotency_key = $1",
      [idempotencyKey],
    );
    if (replay.rows[0]) {
      await client.query("commit");
      return NextResponse.json({ status: "received", reportId: replay.rows[0].id }, { status: 200, headers });
    }
    const id = `issue_${randomUUID()}`;
    await client.query(
      `insert into opportunity_issue_reports
       (id, account_id, opportunity_id, subject_type, subject_id, subject_path, reason, note, correction, evidence_url, status, idempotency_key)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11)`,
      [id, session.account.id, subjectType === "opportunity" ? subjectId : null, subjectType, subjectId, subjectPath ?? null, issueType, correction, correction, evidenceUrl ?? null, idempotencyKey],
    );
    await client.query(
      `insert into audit_events (account_id, action, target_type, target_id, detail)
       values ($1, 'content.issue_reported', 'opportunity_issue_report', $2, $3::jsonb)`,
      [session.account.id, id, JSON.stringify({ subjectType, subjectId, issueType, subjectPath, evidenceUrl })],
    );
    await client.query(
      `insert into outbox_events (topic, aggregate_type, aggregate_id, payload)
       values ('support.issue_reported', 'opportunity_issue_report', $1, $2::jsonb)`,
      [id, JSON.stringify({ subjectType, subjectId, issueType, status: "open" })],
    );
    await client.query("commit");
    return NextResponse.json({ status: "received", reportId: id }, { status: 201, headers });
  } catch {
    await client.query("rollback").catch(() => undefined);
    return NextResponse.json({ error: "The correction could not be saved." }, { status: 503, headers });
  } finally {
    client.release();
    await pool.end();
  }
}
