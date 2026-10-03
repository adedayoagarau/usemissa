import { NextResponse } from 'next/server';
import { creatorPoolFor, readSmsPause, recordPlatformAdminAudit, smsLedgerReady, writeSmsPause } from '@missa/radar-adapters';
import { requirePlatformAdmin } from '@/lib/platformAdmin';

const headers = { 'cache-control': 'private, no-store' };

async function guard(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (!auth.ok) return { denied: NextResponse.json({ error: auth.error }, { status: auth.status, headers }) };
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { denied: NextResponse.json({ error: 'A database is required to pause texts.' }, { status: 503, headers }) };
  const pool = creatorPoolFor(connectionString);
  if (!(await smsLedgerReady(pool))) return { denied: NextResponse.json({ error: 'Run migration 0085 before pausing texts.' }, { status: 503, headers }) };
  return { pool, connectionString, accountId: auth.session.account.id };
}

export async function GET(request: Request) {
  const result = await guard(request);
  if (result.denied) return result.denied;
  return NextResponse.json(await readSmsPause(result.pool), { headers });
}

/** Pauses or resumes every outgoing text: reminders, verification codes and admin tests. Audited. */
export async function POST(request: Request) {
  const result = await guard(request);
  if (result.denied) return result.denied;
  const body = (await request.json().catch(() => ({}))) as { paused?: unknown };
  if (typeof body.paused !== 'boolean') return NextResponse.json({ error: 'Choose whether texts are paused.' }, { status: 400, headers });
  const state = await writeSmsPause(result.pool, body.paused, result.accountId);
  await recordPlatformAdminAudit(
    result.connectionString,
    result.accountId,
    body.paused ? 'platform_admin.sms_paused' : 'platform_admin.sms_resumed',
    'platform_setting',
    'sms.paused',
    { paused: body.paused },
  ).catch(() => undefined);
  return NextResponse.json(state, { headers });
}
