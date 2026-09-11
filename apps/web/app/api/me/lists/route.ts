import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCommandValidationError, CreatorIdempotencyConflictError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { getCreatorTrackerRepository } from '@/lib/creatorRepositories';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const repository = getCreatorTrackerRepository();
  if (repository) {
    return NextResponse.json({
      lists: await repository.lists(session.account.id, session.account.userId ?? session.account.id),
      memberships: await repository.memberships(session.account.id, session.account.userId ?? session.account.id),
    }, { headers });
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const engine = await getEngine();
  return NextResponse.json({ lists: engine.lists(session.account.userId), memberships: engine.listMemberships(session.account.userId) }, { headers });
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => ({}));
  const repository = getCreatorTrackerRepository();
  if (repository) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return NextResponse.json({ error: 'Name must be between 1 and 120 characters.' }, { status: 400, headers });
    try {
      const receipt = await repository.createList(
        creatorCommandEnvelope(session.account.id, 'tracker-list.create', request.headers.get('Idempotency-Key')?.trim() ?? '', { name }, 1),
        { name },
      );
      return NextResponse.json({ id: receipt.resourceId, name, revision: receipt.revision, idempotent: receipt.replayed }, { status: receipt.replayed ? 200 : 201, headers });
    } catch (error) {
      if (error instanceof CreatorCommandValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers });
      if (error instanceof CreatorIdempotencyConflictError) return NextResponse.json({ error: error.message }, { status: 409, headers });
      return NextResponse.json({ error: 'Unable to create List' }, { status: 500, headers });
    }
  }
  if (!session.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  try {
    const engine = await getEngine();
    const list = engine.createList(session.account.userId, body);
    await persistRadar();
    return NextResponse.json(list, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create List' }, { status: 400, headers });
  }
}
