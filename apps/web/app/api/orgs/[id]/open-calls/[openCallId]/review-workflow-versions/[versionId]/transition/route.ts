import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { configurationStatusSchema } from '@/lib/portalConfigurationSchema';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Relational Workspace authority is required' }, { status: 503 });
  const body = await request.json();
  const status = configurationStatusSchema.safeParse(body.status);
  if (!status.success) return NextResponse.json({ error: 'Configuration status is invalid' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const command = workspaceCommandEnvelope(request, { actorAccountId: access.access.session.account.id, organizationId: id, commandType: `review_workflow_version.${status.data}`, payload: { versionId, status: status.data }, expectedRevision: body.expectedRevision });
    const changed = await workspace.transitionReviewWorkflowVersion(command, versionId, status.data);
    return NextResponse.json({ id: changed.resourceId, revision: changed.revision, receiptId: changed.receiptId, idempotent: changed.replayed });
  } catch (error) {
    const mapped = workspaceMutationError(error)!;
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
