import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { workId, dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'delivery.create', payload });
      const task = await workspace.createDeliveryTask(command, payload);
      return NextResponse.json({ id: task.resourceId, ...payload, status: 'pending', revision: task.revision, receiptId: task.receiptId, idempotent: task.replayed }, { status: task.replayed ? 200 : 201, headers });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'Unable to create delivery task' }, { status: mapped?.status ?? 400, headers });
    }
  }
  try {
    const task = result.access.workspace.createDeliveryTask(id, workId, typeof body.dueDate === 'string' ? body.dueDate : undefined);
    await persistOrganizationMutation(result.access, { action: 'delivery.create', targetType: 'delivery_task', targetId: task.id, detail: { workId, dueDate: task.dueDate } });
    return NextResponse.json(task, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create delivery task' }, { status: 400, headers });
  }
}
