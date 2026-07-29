import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const engine = result.access.workspace;
  try {
    const openCall = engine.publishOpenCall(openCallId);
    await persistOrganizationMutation(result.access, {
      action: 'opportunity.publish',
      targetType: 'opportunity',
      targetId: openCall.id,
    });
    return NextResponse.json(openCall);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
