import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; opportunityId: string }> }) {
  const { id, opportunityId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body.workId !== 'string' || !body.workId.trim()) return NextResponse.json({ error: 'workId required' }, { status: 400, headers });
  try {
    const engine = await getEngine();
    const tracked = engine.linkTrackedOpportunityToWork(id, opportunityId, body.workId.trim());
    engine.recordAudit(auth.session.account.id, 'tracker.work_linked', 'tracked_opportunity', opportunityId, JSON.stringify({ workId: body.workId.trim() }));
    await persistRadar();
    return NextResponse.json(tracked, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not link Work.' }, { status: 404, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; opportunityId: string }> }) {
  const { id, opportunityId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers });
  try {
    const engine = await getEngine();
    const tracked = engine.linkTrackedOpportunityToWork(id, opportunityId);
    engine.recordAudit(auth.session.account.id, 'tracker.work_unlinked', 'tracked_opportunity', opportunityId);
    await persistRadar();
    return NextResponse.json(tracked, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not unlink Work.' }, { status: 404, headers });
  }
}
