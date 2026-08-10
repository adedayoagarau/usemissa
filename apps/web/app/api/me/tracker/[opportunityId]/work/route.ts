import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

async function currentAccount(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  return session?.account.userId ? session : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await currentAccount(request);
  if (!session?.account.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  const { opportunityId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.workId !== 'string' || !body.workId.trim()) {
    return NextResponse.json({ error: 'Choose a Library Work' }, { status: 400, headers });
  }

  try {
    const engine = await getEngine();
    const tracked = engine.linkTrackedOpportunityToWork(
      session.account.userId,
      opportunityId,
      body.workId.trim(),
    );
    engine.recordAudit(
      session.account.id,
      'tracker.work_linked',
      'tracked_opportunity',
      opportunityId,
      JSON.stringify({ workId: body.workId.trim() }),
    );
    await persistRadar();
    return NextResponse.json({ status: 'updated', tracked }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not link this Work' },
      { status: 404, headers },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ opportunityId: string }> },
) {
  const session = await currentAccount(request);
  if (!session?.account.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  const { opportunityId } = await params;
  try {
    const engine = await getEngine();
    const tracked = engine.linkTrackedOpportunityToWork(session.account.userId, opportunityId);
    engine.recordAudit(
      session.account.id,
      'tracker.work_unlinked',
      'tracked_opportunity',
      opportunityId,
    );
    await persistRadar();
    return NextResponse.json({ status: 'updated', tracked }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not unlink this Work' },
      { status: 404, headers },
    );
  }
}
