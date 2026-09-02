import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorPreferenceRepository } from '@/lib/creatorRepositories';

/**
 * Story 3.6: unfollow. @missa/radar-engine has followOrganization() but no
 * unfollow -- follows is a plain array on RadarStore (not keyed by id), so
 * this filters it directly, the same "manipulate the store where the engine
 * has no dedicated method" pattern already used for RadarProfile
 * PATCH/DELETE in Story 3.3.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; organizationId: string }> }) {
  const { id, organizationId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const repository = getCreatorPreferenceRepository();
  if (repository) {
    const expectedRevision = Number(request.headers.get('If-Match'));
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) return NextResponse.json({ error: 'If-Match revision is required.' }, { status: 400 });
    try {
      const receipt = await repository.unfollowOrganization(
        creatorCommandEnvelope(auth.session.account.id, 'organization-follow.delete', request.headers.get('Idempotency-Key')?.trim() ?? '', { organizationId }, expectedRevision),
        organizationId,
      );
      return NextResponse.json({ ok: true, removed: true, revision: receipt.revision, idempotent: receipt.replayed });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: error.message, conflict: { action: 'refresh-and-retry', actualRevision: error.actualRevision } }, { status: error.actualRevision === 0 ? 404 : 409 });
      return NextResponse.json({ error: 'We could not unfollow that Organization.' }, { status: 500 });
    }
  }
  const engine = await getEngine();
  const before = engine.store.follows.length;
  engine.store.follows = engine.store.follows.filter((f) => !(f.userId === id && f.organizationId === organizationId));
  const removed = before !== engine.store.follows.length;
  if (removed) await persistRadar();

  return NextResponse.json({ ok: true, removed });
}
