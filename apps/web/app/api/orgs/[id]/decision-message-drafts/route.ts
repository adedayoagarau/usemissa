import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Decision messages are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const fields = ['decisionId', 'recipientAccountId', 'subject', 'body'] as const;
  if (fields.some((field) => typeof body[field] !== 'string' || !body[field].trim())) return NextResponse.json({ error: 'Decision, recipient, subject, and body are required' }, { status: 400 });
  if (body.subject.trim().length > 240 || body.body.trim().length > 20_000) return NextResponse.json({ error: 'Message exceeds the allowed length' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { decisionId: body.decisionId.trim(), recipientAccountId: body.recipientAccountId.trim(), subject: body.subject.trim(), body: body.body.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'decision_message_draft.create', payload });
    const created = await workspace.createDecisionMessageDraft(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, status: 'draft', revision: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Message draft could not be created' }, { status: mapped?.status ?? 500 });
  }
}
