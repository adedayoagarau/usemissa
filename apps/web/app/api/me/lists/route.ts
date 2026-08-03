import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const engine = await getEngine();
  return NextResponse.json({ lists: engine.lists(session.account.userId), memberships: engine.listMemberships(session.account.userId) }, { headers });
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const body = await request.json().catch(() => ({}));
  try {
    const engine = await getEngine();
    const list = engine.createList(session.account.userId, body);
    await persistRadar();
    return NextResponse.json(list, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create List' }, { status: 400, headers });
  }
}
