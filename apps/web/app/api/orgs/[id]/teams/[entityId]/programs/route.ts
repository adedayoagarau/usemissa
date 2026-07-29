import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; entityId: string }> }) {
  const { id, entityId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = result.access.workspace;
  if (!result.access.scope.entity(entityId)) {
    return NextResponse.json({ error: 'Unknown team for this organization' }, { status: 404 });
  }

  try {
    const program = engine.createProgram(entityId, body.name.trim());
    await persistOrganizationMutation(result.access, {
      action: 'program.create',
      targetType: 'program',
      targetId: program.id,
      detail: { teamId: entityId, name: program.name },
    });
    return NextResponse.json(program, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 400 });
  }
}
