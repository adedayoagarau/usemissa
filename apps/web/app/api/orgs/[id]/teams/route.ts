import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (workspaceRelationalAuthorityEnabled()) {
    const workspace = await getRelationalWorkspace();
    const entities = await workspace.entitiesForOrganization(id);
    return NextResponse.json(await Promise.all(entities.map(async (entity) => ({ ...entity, programs: await workspace.programsForEntity(id, entity.id) }))));
  }
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

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'entity.create', payload: { name: body.name.trim(), label: body.label } });
      const created = await workspace.createEntity(command, { name: body.name.trim(), label: typeof body.label === 'string' ? body.label : undefined });
      return NextResponse.json({ id: created.resourceId, name: body.name.trim(), ...(typeof body.label === 'string' ? { label: body.label } : {}), revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 400 });
    }
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
