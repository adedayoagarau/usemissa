import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const engine = await getEngine();
  return NextResponse.json(engine.library(session.account.userId), { headers });
}
