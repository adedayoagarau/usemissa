import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const follows = engine.store.follows.filter((f) => f.userId === id);
  const withNames = follows.map((f) => ({
    organizationId: f.organizationId,
    organizationName: engine.store.organizations.get(f.organizationId)?.name ?? f.organizationId,
    followedAt: f.followedAt,
  }));
  return NextResponse.json(withNames);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.organizationId !== 'string') {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const engine = await getEngine();
  if (!engine.store.organizations.has(body.organizationId)) {
    return NextResponse.json({ error: 'Unknown organization' }, { status: 404 });
  }

  engine.followOrganization(id, body.organizationId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
