import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; entityId: string }> }) {
  const { id, entityId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = getWorkspaceEngine();
  if (!engine.entitiesForOrganization(id).some((e) => e.id === entityId)) {
    return NextResponse.json({ error: 'Unknown team for this organization' }, { status: 404 });
  }

  try {
    const program = engine.createProgram(entityId, body.name.trim());
    return NextResponse.json(program, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 400 });
  }
}
