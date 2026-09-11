import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Reassignment is not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.reviewerAccountId !== 'string' || !body.reviewerAccountId.trim()) return NextResponse.json({ error: 'A reviewer account is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { assignmentId, reviewerAccountId: body.reviewerAccountId.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_assignment.reassign', payload });
    const created = await workspace.reassignReviewAssignment(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Assignment could not be reassigned' }, { status: mapped?.status ?? 500 });
  }
}
