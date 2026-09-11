import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Recusal is not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 2_000) return NextResponse.json({ error: 'A recusal reason is required' }, { status: 400 });
  if (!Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'A valid assignment revision is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { assignmentId, reason: body.reason.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_assignment.recuse', payload, expectedRevision: body.revision });
    const updated = await workspace.recuseReviewAssignment(command, assignmentId, payload.reason);
    return NextResponse.json({ id: assignmentId, recused: true, revision: updated.revision, receiptId: updated.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Assignment could not be recused' }, { status: mapped?.status ?? 500 });
  }
}
