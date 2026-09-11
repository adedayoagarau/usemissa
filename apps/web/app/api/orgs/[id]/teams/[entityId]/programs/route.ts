import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; entityId: string }> }) {
  const { id, entityId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'program.create', payload: { entityId, name: body.name.trim() } });
      const created = await workspace.createProgram(command, { entityId, name: body.name.trim() });
      return NextResponse.json({ id: created.resourceId, entityId, name: body.name.trim(), revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
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
