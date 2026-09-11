import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Review drafts are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (body.score !== undefined && (!Number.isInteger(body.score) || body.score < 0 || body.score > 100)) return NextResponse.json({ error: 'Score must be an integer from 0 to 100' }, { status: 400 });
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.trim().length > 5_000)) return NextResponse.json({ error: 'Notes must be 5000 characters or fewer' }, { status: 400 });
  if (!Number.isSafeInteger(body.revision) || body.revision < 1) return NextResponse.json({ error: 'A valid assignment revision is required' }, { status: 400 });
  const workspace = await getRelationalWorkspace();
  const organizationId = await workspace.organizationForReviewAssignment(session.account.id, assignmentId);
  if (!organizationId) return NextResponse.json({ error: 'Review assignment not found' }, { status: 404 });
  try {
    const payload = { assignmentId, ...(body.score === undefined ? {} : { score: body.score }), ...(body.notes === undefined ? {} : { notes: body.notes.trim() }) };
    const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, organizationId, commandType: 'review.draft_save', payload, expectedRevision: body.revision });
    const saved = await workspace.saveReviewDraft(command, assignmentId, payload);
    return NextResponse.json({ id: assignmentId, status: 'draft', revision: saved.revision, receiptId: saved.receiptId });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Review draft could not be saved' }, { status: mapped?.status ?? 500 });
  }
}
