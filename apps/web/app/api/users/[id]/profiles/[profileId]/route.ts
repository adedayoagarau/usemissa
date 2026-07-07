import { NextResponse } from 'next/server';
import type { MatchCriteria } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

/**
 * PATCH/DELETE aren't in @missa/radar-engine's own API yet (the pre-existing
 * RadarServer only ever had GET/POST for profiles). Rather than extend the
 * core engine's tested public surface for two straightforward CRUD ops, this
 * reads/writes the RadarStore's radarProfiles Map directly -- the same
 * pattern RadarServer's own GET .../profiles route already uses (store.
 * radarProfiles.values(), not a dedicated engine method), so this isn't a new
 * precedent, just the same one applied to update/delete.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; profileId: string }> }) {
  const { id, profileId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const profile = engine.store.radarProfiles.get(profileId);
  if (!profile || profile.userId !== id) return NextResponse.json({ error: 'Unknown saved search' }, { status: 404 });

  const body = await request.json();
  if (typeof body.name === 'string' && body.name.trim()) profile.name = body.name.trim();
  if (body.criteria && typeof body.criteria === 'object') profile.criteria = body.criteria as MatchCriteria;

  return NextResponse.json(profile);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; profileId: string }> }) {
  const { id, profileId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getEngine();
  const profile = engine.store.radarProfiles.get(profileId);
  if (!profile || profile.userId !== id) return NextResponse.json({ error: 'Unknown saved search' }, { status: 404 });

  engine.store.radarProfiles.delete(profileId);
  return NextResponse.json({ ok: true });
}
