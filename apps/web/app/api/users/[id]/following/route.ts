import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError } from '@missa/radar-adapters';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorPreferenceRepository } from '@/lib/creatorRepositories';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const repository = getCreatorPreferenceRepository();
  if (repository) return NextResponse.json(await repository.follows(auth.session.account.id));
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

  const repository = getCreatorPreferenceRepository();
  if (repository) {
    try {
      const receipt = await repository.followOrganization(
        creatorCommandEnvelope(auth.session.account.id, 'organization-follow.create', request.headers.get('Idempotency-Key')?.trim() ?? '', { organizationId: body.organizationId }, 1),
        body.organizationId,
      );
      return NextResponse.json({ ok: true, revision: receipt.revision, idempotent: receipt.replayed }, { status: receipt.replayed ? 200 : 201 });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error instanceof CreatorConflictError) return NextResponse.json({ error: 'Unknown organization' }, { status: 404 });
      return NextResponse.json({ error: 'We could not follow that Organization.' }, { status: 500 });
    }
  }
  const engine = await getEngine();
  if (!engine.store.organizations.has(body.organizationId)) {
    return NextResponse.json({ error: 'Unknown organization' }, { status: 404 });
  }

  engine.followOrganization(id, body.organizationId);
  await persistRadar();
  return NextResponse.json({ ok: true }, { status: 201 });
}
