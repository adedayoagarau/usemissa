import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = getWorkspaceEngine();
  try {
    const openCall = engine.publishOpenCall(openCallId);
    return NextResponse.json(openCall);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
