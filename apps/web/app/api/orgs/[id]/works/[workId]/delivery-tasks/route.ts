import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  const body = await request.json().catch(() => ({}));
  try {
    const task = result.access.workspace.createDeliveryTask(id, workId, typeof body.dueDate === 'string' ? body.dueDate : undefined);
    await persistOrganizationMutation(result.access, { action: 'delivery.create', targetType: 'delivery_task', targetId: task.id, detail: { workId, dueDate: task.dueDate } });
    return NextResponse.json(task, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create delivery task' }, { status: 400, headers });
  }
}
