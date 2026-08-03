import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };

async function userId(request: Request): Promise<string | undefined> {
  const session = await getSessionAccount(request.headers.get('cookie'));
  return session?.account.userId;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUserId = await userId(request);
  if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  try {
    const engine = await getEngine();
    const result = engine.opportunityChecklist(currentUserId, id);
    await persistRadar();
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checklist unavailable' }, { status: 404, headers });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUserId = await userId(request);
  if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { id } = await params;
  try {
    const engine = await getEngine();
    const result = engine.refreshOpportunityChecklist(currentUserId, id);
    await persistRadar();
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checklist refresh failed' }, { status: 400, headers });
  }
}
