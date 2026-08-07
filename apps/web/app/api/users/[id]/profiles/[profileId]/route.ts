import { NextResponse } from 'next/server';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import { savedSearchCriteriaSchema } from '@missa/contracts';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

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

  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 });
  if (typeof body.name === 'string' && body.name.trim()) {
    if (body.name.trim().length > 120) return NextResponse.json({ error: 'Saved search name is too long.' }, { status: 400 });
    profile.name = body.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, 'criteria')) {
    const parsed = savedSearchCriteriaSchema.safeParse(body.criteria);
    if (!parsed.success) return NextResponse.json({ error: 'Saved search criteria are invalid.' }, { status: 400 });
    const taxonomy = canonicalTaxonomySelection(parsed.data.taxonomyTermIds);
    if (taxonomy.invalidTermIds.length > 0) return NextResponse.json({ error: 'Saved search contains an unknown taxonomy term.' }, { status: 400 });
    profile.criteria = parsed.data;
  }

  await persistRadar();
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
  await persistRadar();
  return NextResponse.json({ ok: true });
}
