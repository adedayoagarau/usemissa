import { NextResponse } from 'next/server';
import { creatorRelationalAuthorityEnabled, TrackingLimitReachedError } from '@missa/radar-adapters';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';
import { assertLegacyTrackingAllowance } from '@/lib/legacyTrackingAllowance';
import { trackingLimitBody } from '@/lib/trackingLimit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (creatorRelationalAuthorityEnabled(process.env)) {
    return NextResponse.json(
      { error: 'Use the account-scoped Tracker Save endpoint.' },
      { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const body = await request.json();
  if (typeof body.opportunityId !== 'string') {
    return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
  }

  const engine = await getEngine();
  if (!engine.store.opportunities.has(body.opportunityId)) {
    return NextResponse.json({ error: 'Unknown opportunity' }, { status: 404 });
  }

  // The Free limit applies here as it does to the relational Tracker save.
  try {
    await assertLegacyTrackingAllowance(engine.store, { accountId: auth.session.account.id, userId: id, opportunityId: body.opportunityId });
  } catch (error) {
    if (error instanceof TrackingLimitReachedError) {
      return NextResponse.json(trackingLimitBody(error), { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    }
    throw error;
  }

  const tracked = engine.trackOpportunity(id, body.opportunityId);
  await persistRadar();
  return NextResponse.json(tracked, { status: 201 });
}
