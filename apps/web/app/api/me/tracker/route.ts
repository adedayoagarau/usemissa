import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!session.account.userId) {
    return NextResponse.json({ error: 'Profile is not available for this account' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.opportunityId !== 'string') {
    return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
  }

  const engine = await getEngine();
  if (!engine.store.opportunities.has(body.opportunityId)) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
  }

  const alreadyPresent = engine.store.tracked.some(
    (item) => item.userId === session.account.userId && item.opportunityId === body.opportunityId,
  );
  const tracked = engine.trackOpportunity(session.account.userId, body.opportunityId);
  if (!alreadyPresent) await persistRadar();

  return NextResponse.json(
    { status: alreadyPresent ? 'already-present' : 'created', tracked },
    { status: alreadyPresent ? 200 : 201 },
  );
}
