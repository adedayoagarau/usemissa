import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Decision messages are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (body.status !== 'approved' && body.status !== 'scheduled') return NextResponse.json({ error: 'Choose approved or scheduled' }, { status: 400 });
  if (!Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'A valid revision is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { id: draftId, status: body.status, revision: body.revision };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'decision_message_draft.transition', payload, expectedRevision: body.revision });
    const updated = await workspace.transitionDecisionMessageDraft(command, draftId, body.status);
    return NextResponse.json({ id: draftId, status: body.status, revision: updated.revision, receiptId: updated.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Message draft could not be updated' }, { status: mapped?.status ?? 500 });
  }
}
