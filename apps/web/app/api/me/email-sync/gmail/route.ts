import { NextResponse } from 'next/server';
import { GoogleGmailProvider } from '@missa/radar-adapters';
import { decryptGmailRefreshToken } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } }); }

export async function DELETE(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return json({ error: 'Not authenticated' }, 401);
  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== true || typeof body?.idempotencyKey !== 'string' || !body.idempotencyKey.trim()) return json({ error: 'Confirm disconnect and provide an idempotency key.' }, 400);
  const engine = await getEngine();
  const connection = engine.gmailConnection(session.account.userId);
  if (!connection) return json({ error: 'Gmail is not connected.' }, 404);
  try {
    if (connection.encryptedRefreshToken) {
      try { await new GoogleGmailProvider().revokeToken(decryptGmailRefreshToken(connection.encryptedRefreshToken).token); } catch { /* Local disconnect still removes the credential. */ }
    }
    const result = engine.disconnectGmail(session.account.userId, body.deletePendingCandidates === true);
    engine.recordAudit(session.account.id, 'email.gmail_disconnected', 'gmail_connection', connection.id, JSON.stringify({ userId: session.account.userId, deletedPendingCandidates: result.deletedCandidates, cancelledJobs: result.cancelledJobs }));
    await persistRadar();
    return json(result);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'We could not disconnect Gmail.' }, 400); }
}
