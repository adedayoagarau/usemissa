import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => null) as { opportunityId?: unknown } | null;
  if (!body || typeof body.opportunityId !== 'string') return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
  const engine = await getEngine();
  if (!engine.store.opportunities.has(body.opportunityId)) return NextResponse.json({ error: 'Unknown opportunity' }, { status: 404 });
  const tracked = engine.bookmarkOpportunity(id, body.opportunityId);
  await persistRadar();
  return NextResponse.json({ bookmarked: true, tracked }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => null) as { opportunityId?: unknown } | null;
  if (!body || typeof body.opportunityId !== 'string') return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
  const engine = await getEngine();
  if (!engine.store.opportunities.has(body.opportunityId)) return NextResponse.json({ error: 'Unknown opportunity' }, { status: 404 });
  const tracked = engine.unbookmarkOpportunity(id, body.opportunityId);
  await persistRadar();
  return NextResponse.json({ bookmarked: false, tracked: tracked ?? null });
}
