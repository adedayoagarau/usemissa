import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  if (body.status !== 'pending' && body.status !== 'complete') return NextResponse.json({ error: 'status must be pending or complete' }, { status: 400, headers });
  try {
    const task = result.access.workspace.updateDeliveryTask(id, taskId, body.status);
    await persistOrganizationMutation(result.access, { action: 'delivery.update', targetType: 'delivery_task', targetId: task.id, detail: { status: task.status } });
    return NextResponse.json(task, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update delivery task' }, { status: 400, headers });
  }
}
