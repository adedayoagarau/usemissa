import { NextResponse } from 'next/server';
import { isMyStatus } from '@missa/radar-engine';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  const { opportunityId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== 'string' || !isMyStatus(body.status)) {
    return NextResponse.json({ error: 'Choose a valid Tracker status' }, { status: 400, headers });
  }

  const engine = await getEngine();
  const current = engine.store.tracked.find(
    (item) => item.userId === session.account.userId && item.opportunityId === opportunityId,
  );
  if (!current) {
    return NextResponse.json({ error: 'Tracker item not found' }, { status: 404, headers });
  }

  const previousStatus = current.myStatus;
  const tracked = engine.setMyStatus(session.account.userId, opportunityId, body.status);
  if (previousStatus !== tracked.myStatus) {
    engine.recordAudit(
      session.account.id,
      'tracker.status_updated',
      'tracked_opportunity',
      opportunityId,
      JSON.stringify({ from: previousStatus, to: tracked.myStatus }),
    );
    await persistRadar();
  }

  return NextResponse.json(
    { status: previousStatus === tracked.myStatus ? 'unchanged' : 'updated', tracked },
    { headers },
  );
}
