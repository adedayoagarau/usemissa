import { NextResponse } from 'next/server';
import { creatorRelationalAuthorityEnabled } from '@missa/radar-adapters';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (creatorRelationalAuthorityEnabled(process.env)) return NextResponse.json({ error: 'Use the account-scoped Tracker endpoint.' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });

  const engine = await getEngine();
  return NextResponse.json(engine.getTracker(id));
}
