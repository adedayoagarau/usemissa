import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const { id, groupId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Reviewer groups are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.reviewerAccountId !== 'string' || !body.reviewerAccountId.trim()) return NextResponse.json({ error: 'A reviewer account is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { groupId, reviewerAccountId: body.reviewerAccountId.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'reviewer_group.member_add', payload });
    const added = await workspace.addReviewerGroupMember(command, payload);
    return NextResponse.json({ groupId, reviewerAccountId: payload.reviewerAccountId, revision: added.revision, receiptId: added.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Reviewer could not be added to the group' }, { status: mapped?.status ?? 500 });
  }
}
