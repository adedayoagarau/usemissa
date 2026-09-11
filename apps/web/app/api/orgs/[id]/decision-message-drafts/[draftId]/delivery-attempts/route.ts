import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Delivery telemetry is not available yet' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!['accepted', 'delivered', 'failed'].includes(body.providerStatus)) return NextResponse.json({ error: 'Choose accepted, delivered, or failed' }, { status: 400 });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { messageDraftId: draftId, providerStatus: body.providerStatus, ...(typeof body.providerReference === 'string' ? { providerReference: body.providerReference.trim().slice(0, 240) } : {}), ...(typeof body.errorCode === 'string' ? { errorCode: body.errorCode.trim().slice(0, 120) } : {}), ...(typeof body.retryAt === 'string' ? { retryAt: body.retryAt } : {}) };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'message_delivery_attempt.record', payload });
    const created = await workspace.recordMessageDeliveryAttempt(command, payload);
    return NextResponse.json({ id: created.resourceId, ...payload, attemptNumber: created.revision, receiptId: created.receiptId }, { status: 201 });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Delivery attempt could not be recorded' }, { status: mapped?.status ?? 500 });
  }
}
