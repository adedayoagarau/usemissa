import { NextResponse } from 'next/server';
import { creatorPoolFor } from '@missa/radar-adapters';
import { verifyUnsubscribeToken } from '@/lib/email-tokens';

const headers = { 'Cache-Control': 'no-store' };

async function applyUnsubscribe(accountId: string, category: string): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return true; // In development/test mock without DB, report success

  const pool = creatorPoolFor(connectionString);
  const result = await pool.query(
    `update notification_preferences
        set email_enabled = case when $2 in ('all', 'notification_digest') then false else email_enabled end,
            saved_search_enabled = case when $2 in ('all', 'saved_search') then false else saved_search_enabled end,
            reminder_enabled = case when $2 in ('all', 'deadline_reminder') then false else reminder_enabled end,
            revision = revision + 1,
            updated_at = now()
      where account_id = $1`,
    [accountId, category]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * RFC 8058 One-Click Unsubscribe endpoint (POST) & direct API unsubscribe (GET).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const tokenFromUrl = url.searchParams.get('token');
  const body = await request.json().catch(() => null) as { token?: string } | null;
  const token = tokenFromUrl || body?.token;

  if (!token) {
    return NextResponse.json({ error: 'Missing unsubscribe token.' }, { status: 400, headers });
  }

  const verification = verifyUnsubscribeToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { error: `Invalid or expired unsubscribe link (${verification.reason}).` },
      { status: 400, headers }
    );
  }

  await applyUnsubscribe(verification.accountId, verification.category);

  return NextResponse.json(
    {
      ok: true,
      unsubscribed: true,
      accountId: verification.accountId,
      category: verification.category,
    },
    { status: 200, headers }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing unsubscribe token.' }, { status: 400, headers });
  }

  const verification = verifyUnsubscribeToken(token);
  if (!verification.valid) {
    return NextResponse.json(
      { error: `Invalid or expired unsubscribe link (${verification.reason}).` },
      { status: 400, headers }
    );
  }

  await applyUnsubscribe(verification.accountId, verification.category);

  return NextResponse.json(
    {
      ok: true,
      unsubscribed: true,
      accountId: verification.accountId,
      category: verification.category,
    },
    { status: 200, headers }
  );
}
