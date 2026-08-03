import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return json({ error: 'Not authenticated' }, 401);
  if (!session.account.userId) return json({ error: 'Profile not found' }, 404);
  const engine = await getEngine();
  const connection = engine.gmailConnection(session.account.userId);
  const pending = connection ? engine.store.emailCandidates.filter((candidate) => candidate.userId === session.account.userId && candidate.gmailConnectionId === connection.id && (candidate.state === 'pending' || candidate.state === 'duplicate')).length : 0;
  return json({
    forwarding: engine.forwardingAddress(session.account.userId),
    gmail: connection ? {
      connected: true,
      accountEmailMasked: connection.accountEmailMasked,
      mode: connection.mode,
      status: connection.status,
      scanWindowDays: connection.scanWindowDays,
      lastSyncAt: connection.lastSyncAt,
      nextSyncAt: connection.nextSyncAt,
      watchExpiration: connection.watchExpiration,
      lastErrorCode: connection.lastErrorCode,
      pendingCandidates: pending,
    } : { connected: false, mode: 'review', status: 'disconnected', scanWindowDays: 30, pendingCandidates: 0 },
    retentionDays: 30,
  });
}
