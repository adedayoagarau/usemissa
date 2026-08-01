import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  try { return NextResponse.json(engine.getSubmissionDraft(id, draftId)); }
  catch { return NextResponse.json({ error: 'Unknown submission draft' }, { status: 404 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!Array.isArray(body.materialIds) || body.materialIds.some((value) => typeof value !== 'string')) return NextResponse.json({ error: 'materialIds must be an array of ids' }, { status: 400 });
  const engine = await getEngine();
  try {
    const draft = engine.updateSubmissionDraft(id, draftId, { materialIds: body.materialIds as string[], note: typeof body.note === 'string' ? body.note : undefined });
    await persistRadar();
    return NextResponse.json(draft);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update submission' }, { status: 400 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const engine = await getEngine();
  try {
    const draft = engine.markSubmissionSubmitted(id, draftId);
    await persistRadar();
    return NextResponse.json(draft);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not mark submission' }, { status: 400 }); }
}
