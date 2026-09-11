import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json(await (await getRelationalWorkspace()).reviewRoundsForOpenCall(id, openCallId));
  const engine = result.access.workspace;
  return NextResponse.json(engine.reviewRoundsForOpenCall(openCallId));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; openCallId: string }> }) {
  const { id, openCallId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.openCall(openCallId)) {
    return NextResponse.json({ error: 'Unknown opportunity for this organization' }, { status: 404 });
  }

  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { openCallId, name: body.name.trim() };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'review_round.create', payload });
      const created = await workspace.createReviewRound(command, payload);
      return NextResponse.json({ id: created.resourceId, ...payload, revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
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
