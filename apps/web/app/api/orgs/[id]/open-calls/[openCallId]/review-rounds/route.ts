import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getWorkspaceEngine();
  return NextResponse.json(engine.reviewRoundsForOpenCall(openCallId));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = await getWorkspaceEngine();
  try {
    const round = engine.createReviewRound(openCallId, body.name.trim());
    await persistWorkspace();
    return NextResponse.json(round, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
