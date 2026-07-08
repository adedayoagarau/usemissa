import { NextResponse } from 'next/server';
import type { MatchCriteria } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  return NextResponse.json([...engine.store.radarProfiles.values()].filter((p) => p.userId === id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = await getEngine();
  const profile = engine.createRadarProfile(id, body.name.trim(), (body.criteria as MatchCriteria) ?? {});
  await persistRadar();
  return NextResponse.json(profile, { status: 201 });
}
