import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request, { params }: { params: Promise<{ id: string; opportunityId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id, opportunityId } = await params;
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
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id, opportunityId } = await params;
  try {
    const engine = await getEngine();
    engine.removeFromList(session.account.userId, id, opportunityId);
    await persistRadar();
    return new NextResponse(null, { status: 204, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to remove opportunity' }, { status: 400, headers });
  }
}
