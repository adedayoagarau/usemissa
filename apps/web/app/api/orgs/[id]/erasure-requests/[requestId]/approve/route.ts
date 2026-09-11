import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['owner'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Erasure approvals are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'A valid request revision is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { id: requestId, revision: body.revision };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'organization_erasure_request.approve', payload, expectedRevision: body.revision });
    const approved = await workspace.approveErasureRequest(command, requestId);
    return NextResponse.json({ id: requestId, status: 'approved', revision: approved.revision, receiptId: approved.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Erasure request could not be approved' }, { status: mapped?.status ?? 500 });
  }
}
