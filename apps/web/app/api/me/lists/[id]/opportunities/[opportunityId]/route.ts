import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorConflictError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

async function relationalMutation(request: Request, accountId: string, listId: string, opportunityId: string, operation: 'add' | 'remove') {
  const repository = getCreatorTrackerRepository();
  if (!repository) return undefined;
  const expectedRevision = Number(request.headers.get('If-Match'));
  try {
    const envelope = creatorCommandEnvelope(accountId, `tracker-list.${operation}`, request.headers.get('Idempotency-Key')?.trim() ?? '', { listId, opportunityId }, expectedRevision);
    const receipt = operation === 'add' ? await repository.addOpportunity(envelope, listId, opportunityId) : await repository.removeOpportunity(envelope, listId, opportunityId);
    return NextResponse.json({ ok: true, revision: receipt.revision, idempotent: receipt.replayed }, { status: operation === 'add' && !receipt.replayed ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    if (error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error: error.message }, { status: 409, headers });
    return NextResponse.json({ error: `Unable to ${operation} opportunity` }, { status: 500, headers });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; opportunityId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id, opportunityId } = await params;
  const relational = await relationalMutation(request, session.account.id, id, opportunityId, 'add');
  if (relational) return relational;
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const membership = engine.addToList(session.account.userId, id, opportunityId);
    await persistRadar();
    return NextResponse.json(membership, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add opportunity' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; opportunityId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id, opportunityId } = await params;
  const relational = await relationalMutation(request, session.account.id, id, opportunityId, 'remove');
  if (relational) return relational;
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    engine.removeFromList(session.account.userId, id, opportunityId);
    await persistRadar();
    return new NextResponse(null, { status: 204, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove opportunity' }, { status: 400, headers });
  }
}
