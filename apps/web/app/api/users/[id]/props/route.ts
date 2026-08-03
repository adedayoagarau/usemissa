import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session || session.account.userId !== id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const engine = await getEngine();
  return NextResponse.json({ props: engine.propsForUser(id) }, { headers: { 'cache-control': 'private, no-store' } });
}
