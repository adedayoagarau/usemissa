import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { openCallId, status: 'published' };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'open_call.publish', payload, expectedRevision: (await request.clone().json().catch(() => ({})) as { expectedRevision?: unknown }).expectedRevision });
      const published = await workspace.setOpenCallStatus(command, openCallId, 'published');
      return NextResponse.json({ id: published.resourceId, status: 'published', revision: published.revision, receiptId: published.receiptId, idempotent: published.replayed });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
  }
  const engine = result.access.workspace;
  try {
    const openCall = engine.publishOpenCall(openCallId);
    await persistOrganizationMutation(result.access, {
      action: 'opportunity.publish',
      targetType: 'opportunity',
      targetId: openCall.id,
    });
    return NextResponse.json(openCall);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
