import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Review corrections are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 2_000) return NextResponse.json({ error: 'A correction reason is required' }, { status: 400 });
  if (!Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'A valid assignment revision is required' }, { status: 400 });
  if (body.score !== undefined && (!Number.isInteger(body.score) || body.score < 0 || body.score > 100)) return NextResponse.json({ error: 'Score must be an integer from 0 to 100' }, { status: 400 });
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.trim().length > 5_000)) return NextResponse.json({ error: 'Notes must be 5000 characters or fewer' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { assignmentId, ...(body.score === undefined ? {} : { score: body.score }), ...(body.notes === undefined ? {} : { notes: body.notes.trim() }), reason: body.reason.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_recommendation.correct', payload, expectedRevision: body.revision });
    const corrected = await workspace.correctReviewRecommendation(command, assignmentId, payload);
    return NextResponse.json({ id: corrected.resourceId, assignmentId, revision: corrected.revision, receiptId: corrected.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Review recommendation could not be corrected' }, { status: mapped?.status ?? 500 });
  }
}
