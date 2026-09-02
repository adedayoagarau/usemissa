import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { canonicalTaxonomySelection } from '@missa/taxonomy';
import { savedSearchCriteriaSchema } from '@missa/contracts';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorPreferenceRepository } from '@/lib/creatorRepositories';

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

  const body = await request.json().catch(() => undefined);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 });
  const repository = getCreatorPreferenceRepository();
  if (repository) {
    const current = await repository.savedSearch(auth.session.account.id, id, profileId);
    if (!current) return NextResponse.json({ error: 'Unknown saved search' }, { status: 404 });
    const name = typeof body.name === 'string' ? body.name.trim() : current.name;
    if (!name || name.length > 120) return NextResponse.json({ error: 'Saved search name is invalid.' }, { status: 400 });
    const parsed = Object.prototype.hasOwnProperty.call(body, 'criteria') ? savedSearchCriteriaSchema.safeParse(body.criteria) : { success: true as const, data: current.criteria };
    if (!parsed.success) return NextResponse.json({ error: 'Saved search criteria are invalid.' }, { status: 400 });
    if (canonicalTaxonomySelection(parsed.data.taxonomyTermIds ?? []).invalidTermIds.length > 0) return NextResponse.json({ error: 'Saved search contains an unknown taxonomy term.' }, { status: 400 });
    const expectedRevision = Number(request.headers.get('If-Match'));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return NextResponse.json({ error: 'If-Match revision is required.' }, { status: 400 });
    try {
      const input = { id: profileId, name, criteria: parsed.data, includeInDigest: current.includeInDigest };
      const receipt = await repository.updateSavedSearch(
        creatorCommandEnvelope(auth.session.account.id, 'saved-search.update', request.headers.get('Idempotency-Key')?.trim() ?? '', input, expectedRevision), input,
      );
      return NextResponse.json({ ...current, name, criteria: parsed.data, revision: receipt.revision, idempotent: receipt.replayed });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', actualRevision: error.actualRevision } }, { status: 409 });
      return NextResponse.json({ error: 'We could not update that saved search.' }, { status: 500 });
    }
  }

  const engine = await getEngine();
  const profile = engine.store.radarProfiles.get(profileId);
  if (!profile || profile.userId !== id) return NextResponse.json({ error: 'Unknown saved search' }, { status: 404 });
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

  const repository = getCreatorPreferenceRepository();
  if (repository) {
    const expectedRevision = Number(request.headers.get('If-Match'));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return NextResponse.json({ error: 'If-Match revision is required.' }, { status: 400 });
    try {
      const receipt = await repository.deleteSavedSearch(
        creatorCommandEnvelope(auth.session.account.id, 'saved-search.delete', request.headers.get('Idempotency-Key')?.trim() ?? '', { profileId }, expectedRevision),
        profileId,
      );
      return NextResponse.json({ ok: true, removed: true, revision: receipt.revision, idempotent: receipt.replayed });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', actualRevision: error.actualRevision } }, { status: error.actualRevision === 0 ? 404 : 409 });
      return NextResponse.json({ error: 'We could not delete that saved search.' }, { status: 500 });
    }
  }
  const engine = await getEngine();
  const profile = engine.store.radarProfiles.get(profileId);
  if (!profile || profile.userId !== id) return NextResponse.json({ error: 'Unknown saved search' }, { status: 404 });

  engine.store.radarProfiles.delete(profileId);
  await persistRadar();
  return NextResponse.json({ ok: true });
}
