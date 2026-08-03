import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown open call for this organization' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  try {
    const openCall = result.access.workspace.updateOpenCall(openCallId, { title: typeof body.title === 'string' ? body.title : undefined, guidelineUrl: typeof body.guidelineUrl === 'string' ? body.guidelineUrl : undefined, guidelineText: typeof body.guidelineText === 'string' ? body.guidelineText : undefined });
    await persistOrganizationMutation(result.access, { action: 'opportunity.update', targetType: 'opportunity', targetId: openCall.id });
    return NextResponse.json(openCall);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update open call' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) return NextResponse.json({ error: 'Unknown open call for this organization' }, { status: 404 });
  try {
    const openCall = result.access.workspace.closeOpenCall(openCallId);
    await persistOrganizationMutation(result.access, { action: 'opportunity.close', targetType: 'opportunity', targetId: openCall.id });
    return NextResponse.json(openCall);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to close open call' }, { status: 400 });
  }
}
