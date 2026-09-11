import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Erasure requests are not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!['drafts', 'uploads', 'reviews', 'messages'].includes(body.scope)) return NextResponse.json({ error: 'Choose a valid erasure scope' }, { status: 400 });
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 2_000) return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { scope: body.scope, reason: body.reason.trim() };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'organization_erasure_request.create', payload });
    const created = await workspace.createErasureRequest(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, status: 'requested', revision: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Erasure request could not be created' }, { status: mapped?.status ?? 500 });
  }
}
