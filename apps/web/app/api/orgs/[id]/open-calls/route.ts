import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (workspaceRelationalAuthorityEnabled()) return NextResponse.json(await (await getRelationalWorkspace()).openCallsForOrganization(id));
  const engine = result.access.workspace;
  const programs = engine.entitiesForOrganization(id).flatMap((e) => engine.programsForEntity(e.id));
  const openCalls = programs.flatMap((p) => engine.openCallsForProgram(p.id));
  return NextResponse.json(openCalls);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  if (typeof body.programId !== 'string' || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'programId and title are required' }, { status: 400 });
  }

  const relational = workspaceRelationalAuthorityEnabled();
  const engine = result.access.workspace;
  if (!relational && !result.access.scope.program(body.programId)) {
    return NextResponse.json({ error: 'Unknown program for this organization' }, { status: 404 });
  }
  if (body.radarOpportunityId !== undefined) {
    const radarOpportunity =
      typeof body.radarOpportunityId === 'string'
        ? result.access.radar.store.opportunities.get(body.radarOpportunityId)
        : undefined;
    if (!radarOpportunity || radarOpportunity.claimedByOrganizationId !== id) {
      return NextResponse.json({ error: 'This opportunity must be claimed by the organization' }, { status: 400 });
    }
  }

  if (relational) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { programId: body.programId, title: body.title.trim(), radarOpportunityId: body.radarOpportunityId };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'open_call.create', payload });
      const created = await workspace.createOpenCall(command, payload);
      return NextResponse.json({ id: created.resourceId, ...payload, status: 'draft', revision: created.revision, receiptId: created.receiptId, idempotent: created.replayed }, { status: created.replayed ? 200 : 201 });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'failed' }, { status: mapped?.status ?? 404 });
    }
  }
  const openCall = engine.createOpenCall(body.programId, body.title.trim(), body.radarOpportunityId);
  await persistOrganizationMutation(result.access, {
    action: 'opportunity.create',
    targetType: 'opportunity',
    targetId: openCall.id,
    detail: { programId: body.programId, title: openCall.title },
  });
  return NextResponse.json(openCall, { status: 201 });
}
