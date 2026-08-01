import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const engine = result.access.workspace;
  const entities = engine.entitiesForOrganization(id).map((e) => ({
    ...e,
    programs: engine.programsForEntity(e.id),
  }));
  return NextResponse.json(entities);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = result.access.workspace;
  const entity = engine.createEntity(id, body.name.trim(), body.label);
  await persistOrganizationMutation(result.access, {
    action: 'team.create',
    targetType: 'team',
    targetId: entity.id,
    detail: { name: entity.name },
  });
  return NextResponse.json(entity, { status: 201 });
}
