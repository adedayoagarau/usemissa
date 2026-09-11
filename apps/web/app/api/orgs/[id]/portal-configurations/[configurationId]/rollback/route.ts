import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; configurationId: string }> }) {
  const { id, configurationId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { sourceId: configurationId };
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'portal_configuration.rollback', payload });
    const rolledBack = await workspace.rollbackPortalConfiguration(command, configurationId);
    const configuration = await workspace.portalConfiguration(id, rolledBack.resourceId);
    if (!configuration) return NextResponse.json({ error: 'Restored portal configuration could not be read' }, { status: 500 });
    return NextResponse.json({ id: rolledBack.resourceId, version: configuration.version, revision: rolledBack.revision, receiptId: rolledBack.receiptId, idempotent: rolledBack.replayed }, { status: rolledBack.replayed ? 200 : 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
