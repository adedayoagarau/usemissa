import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { portalConfigurationSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

type Params = { id: string; configurationId: string };

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { id, configurationId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const configuration = await (await getRelationalWorkspace()).portalConfiguration(id, configurationId);
  return configuration ? NextResponse.json(configuration) : NextResponse.json({ error: 'Portal configuration not found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  const { id, configurationId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const body = await request.json();
  const parsed = portalConfigurationSchema.safeParse(body.configuration);
  if (!parsed.success) return NextResponse.json({ error: 'Portal configuration is invalid', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'portal_configuration.update', payload: parsed.data, expectedRevision: body.expectedRevision });
    const updated = await workspace.updatePortalConfiguration(command, configurationId, parsed.data);
    return NextResponse.json({ id: updated.resourceId, revision: updated.revision, receiptId: updated.receiptId, idempotent: updated.replayed });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

