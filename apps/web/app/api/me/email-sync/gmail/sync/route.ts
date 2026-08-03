import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return json({ error: 'Not authenticated' }, 401);
  try {
    const engine = await getEngine();
    const bucket = Math.floor(Date.now() / (15 * 60_000));
    const job = engine.queueGmailSync(session.account.userId, 'manual', `manual:${session.account.userId}:${bucket}`);
    engine.recordAudit(session.account.id, 'email.gmail_sync_started', 'gmail_connection', job.connectionId, JSON.stringify({ userId: session.account.userId, trigger: 'manual' }));
    await persistRadar();
    return json({ jobId: job.id, status: job.status });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'We could not queue Gmail Sync.' }, 400); }
}
