import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  return NextResponse.json(engine.listSubmissionDrafts(id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body.opportunityId !== 'string' || !body.opportunityId.trim()) return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
  const engine = await getEngine();
  try {
    const draft = engine.prepareSubmission(id, body.opportunityId.trim());
    await persistRadar();
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare submission' }, { status: 400 });
  }
}
