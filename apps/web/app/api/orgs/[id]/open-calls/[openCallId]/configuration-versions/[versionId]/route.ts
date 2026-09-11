import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { opportunityConfigurationSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const body = await request.json();
  const parsed = opportunityConfigurationSchema.safeParse(body.configuration);
  if (!parsed.success) return NextResponse.json({ error: 'Opportunity configuration is invalid', issues: parsed.error.flatten() }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: 'opportunity_configuration_version.update', payload: parsed.data, expectedRevision: body.expectedRevision });
    const updated = await workspace.updateOpportunityConfigurationVersion(command, versionId, parsed.data);
    return NextResponse.json({ id: updated.resourceId, revision: updated.revision, receiptId: updated.receiptId, idempotent: updated.replayed });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
