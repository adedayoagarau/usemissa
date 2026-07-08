import { NextResponse } from 'next/server';
import { isMyStatus } from '@missa/radar-engine';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.opportunityId !== 'string' || !isMyStatus(body.status)) {
    return NextResponse.json({ error: 'opportunityId and a valid status are required' }, { status: 400 });
  }

  const engine = await getEngine();
  const tracked = engine.setMyStatus(id, body.opportunityId, body.status);
  await persistRadar();
  return NextResponse.json(tracked);
}
