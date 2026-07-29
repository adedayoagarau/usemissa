import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const engine = result.access.workspace;
  return NextResponse.json(engine.reviewRoundsForOpenCall(openCallId));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const engine = result.access.workspace;
  try {
    const round = engine.createReviewRound(openCallId, body.name.trim());
    await persistOrganizationMutation(result.access, {
      action: 'review-round.create',
      targetType: 'review-round',
      targetId: round.id,
      detail: { opportunityId: openCallId, name: round.name },
    });
    return NextResponse.json(round, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'failed' }, { status: 404 });
  }
}
