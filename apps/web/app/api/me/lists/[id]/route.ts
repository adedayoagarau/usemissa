import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

function relationalError(error: unknown, fallback: string) {
  if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
  if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error: error.message }, { status: 409, headers });
  return NextResponse.json({ error: fallback }, { status: 500, headers });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const repository = getCreatorTrackerRepository();
  if (repository) {
    const input = {
      ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
      ...(body.description === null || typeof body.description === 'string' ? { description: body.description === null ? null : body.description.trim() } : {}),
      ...(body.colorToken === null || typeof body.colorToken === 'string' ? { colorToken: body.colorToken === null ? null : body.colorToken.trim() } : {}),
      ...(typeof body.archived === 'boolean' ? { archived: body.archived } : {}),
    };
    if (input.name !== undefined && (!input.name || input.name.length > 120)) return NextResponse.json({ error: 'Name must be between 1 and 120 characters.' }, { status: 400, headers });
    try {
      const receipt = await repository.updateList(creatorCommandEnvelope(session.account.id, 'tracker-list.update', request.headers.get('Idempotency-Key')?.trim() ?? '', input, Number(request.headers.get('If-Match'))), id, input);
      return NextResponse.json({ id, ...input, revision: receipt.revision, idempotent: receipt.replayed }, { headers });
    } catch (error) { return relationalError(error, 'Unable to update List'); }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const list = engine.updateList(session.account.userId, id, body);
    await persistRadar();
    return NextResponse.json(list, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update List' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const repository = getCreatorTrackerRepository();
  if (repository) {
    try {
      const receipt = await repository.deleteList(creatorCommandEnvelope(session.account.id, 'tracker-list.delete', request.headers.get('Idempotency-Key')?.trim() ?? '', { id }, Number(request.headers.get('If-Match'))), id);
      return NextResponse.json({ ok: true, removed: true, revision: receipt.revision, idempotent: receipt.replayed }, { headers });
    } catch (error) { return relationalError(error, 'Unable to delete List'); }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    engine.deleteList(session.account.userId, id);
    await persistRadar();
    return new NextResponse(null, { status: 204, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete List' }, { status: 400, headers });
  }
}
