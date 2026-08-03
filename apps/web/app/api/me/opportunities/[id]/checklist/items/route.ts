import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session?.account.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const engine = await getEngine();
    const item = engine.addChecklistItem(session.account.userId, id, { label: body.label, note: body.note });
    await persistRadar();
    return NextResponse.json(item, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to add requirement' }, { status: 400, headers });
  }
}
