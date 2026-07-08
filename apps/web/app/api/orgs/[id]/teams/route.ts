import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = await getWorkspaceEngine();
  const entities = engine.entitiesForOrganization(id).map((e) => ({
    ...e,
    programs: engine.programsForEntity(e.id),
  }));
  return NextResponse.json(entities);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = await getWorkspaceEngine();
  const entity = engine.createEntity(id, body.name.trim(), body.label);
  await persistWorkspace();
  return NextResponse.json(entity, { status: 201 });
}
