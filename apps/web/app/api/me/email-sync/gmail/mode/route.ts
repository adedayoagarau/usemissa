import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json().catch(() => ({}));
  if (!['review', 'autopilot'].includes(body?.mode) || typeof body?.idempotencyKey !== 'string' || !body.idempotencyKey.trim()) return json({ error: 'Choose a mode and provide an idempotency key.' }, 400);
  try {
    const engine = await getEngine();
    const connection = engine.setGmailMode(session.account.userId, body.mode, body.confirmation === true, body.idempotencyKey);
    engine.recordAudit(session.account.id, 'email.gmail_mode_changed', 'gmail_connection', connection.id, JSON.stringify({ userId: session.account.userId, mode: connection.mode }));
    await persistRadar();
    return json({ mode: connection.mode, status: connection.status });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'We could not change Gmail mode.' }, 400); }
}
