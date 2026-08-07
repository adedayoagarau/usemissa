import { NextResponse } from 'next/server';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import { savedSearchInputSchema } from '@missa/contracts';
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

  const body = await request.json().catch(() => undefined);
  const parsed = savedSearchInputSchema.safeParse({
    name: body && typeof body === 'object' && !Array.isArray(body) ? body.name : undefined,
    criteria: body && typeof body === 'object' && !Array.isArray(body) ? body.criteria ?? {} : {},
    includeInDigest: body && typeof body === 'object' && !Array.isArray(body) ? body.includeInDigest : undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Saved search criteria are invalid.' }, { status: 400 });
  const taxonomy = canonicalTaxonomySelection(parsed.data.criteria.taxonomyTermIds);
  if (taxonomy.invalidTermIds.length > 0) return NextResponse.json({ error: 'Saved search contains an unknown taxonomy term.' }, { status: 400 });

  const engine = await getEngine();
  const profile = engine.createRadarProfile(id, parsed.data.name, parsed.data.criteria);
  await persistRadar();
  return NextResponse.json(profile, { status: 201 });
}
