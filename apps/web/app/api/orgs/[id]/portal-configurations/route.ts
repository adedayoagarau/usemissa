import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { portalConfigurationSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  return NextResponse.json(await (await getRelationalWorkspace()).portalConfigurationsForOrganization(id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const parsed = portalConfigurationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Portal configuration is invalid', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'portal_configuration.create', payload: parsed.data });
    const created = await workspace.createPortalConfiguration(command, parsed.data);
    const configuration = await workspace.portalConfiguration(id, created.resourceId);
    if (!configuration) return NextResponse.json({ error: 'Created portal configuration could not be read' }, { status: 500 });
    return NextResponse.json({ id: created.resourceId, version: configuration.version, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
