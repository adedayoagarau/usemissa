import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown open call for this organization' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'This Open Call edit is not in the relational launch-slice command contract' }, { status: 501 });
  try {
    const openCall = result.access.workspace.updateOpenCall(openCallId, { title: typeof body.title === 'string' ? body.title : undefined, guidelineUrl: typeof body.guidelineUrl === 'string' ? body.guidelineUrl : undefined, guidelineText: typeof body.guidelineText === 'string' ? body.guidelineText : undefined });
    await persistOrganizationMutation(result.access, { action: 'opportunity.update', targetType: 'opportunity', targetId: openCall.id });
    return NextResponse.json(openCall);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update open call' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown open call for this organization' }, { status: 404 });
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { openCallId, status: 'closed' };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'open_call.close', payload, expectedRevision: (await request.clone().json().catch(() => ({})) as { expectedRevision?: unknown }).expectedRevision });
      const closed = await workspace.setOpenCallStatus(command, openCallId, 'closed');
      return NextResponse.json({ id: closed.resourceId, status: 'closed', revision: closed.revision, receiptId: closed.receiptId, idempotent: closed.replayed });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'Unable to close open call' }, { status: mapped?.status ?? 400 });
    }
  }
  try {
    const openCall = result.access.workspace.closeOpenCall(openCallId);
    await persistOrganizationMutation(result.access, { action: 'opportunity.close', targetType: 'opportunity', targetId: openCall.id });
    return NextResponse.json(openCall);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to close open call' }, { status: 400 });
  }
}
