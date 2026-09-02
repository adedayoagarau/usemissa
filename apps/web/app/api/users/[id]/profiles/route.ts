import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import { savedSearchInputSchema } from '@missa/contracts';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorPreferenceRepository } from '@/lib/creatorRepositories';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const repository = getCreatorPreferenceRepository();
  if (repository) return NextResponse.json(await repository.savedSearches(auth.session.account.id, id));
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

  const repository = getCreatorPreferenceRepository();
  if (repository) {
    try {
      const searchId = `search_${randomUUID()}`;
      const receipt = await repository.createSavedSearch(
        creatorCommandEnvelope(auth.session.account.id, 'saved-search.create', request.headers.get('Idempotency-Key')?.trim() ?? '', parsed.data, 1),
        { id: searchId, name: parsed.data.name, criteria: parsed.data.criteria, includeInDigest: parsed.data.includeInDigest ?? false },
      );
      return NextResponse.json({ id: searchId, userId: id, ...parsed.data, revision: receipt.revision, idempotent: receipt.replayed }, { status: receipt.replayed ? 200 : 201 });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry' } }, { status: 409 });
      return NextResponse.json({ error: 'We could not save that search.' }, { status: 500 });
    }
  }
  const engine = await getEngine();
  const profile = engine.createRadarProfile(id, parsed.data.name, parsed.data.criteria);
  await persistRadar();
  return NextResponse.json(profile, { status: 201 });
}
