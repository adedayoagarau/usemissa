import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';
import { getRelationalWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { persistRadar } from '@/lib/engine';

const headers = { 'Cache-Control': 'private, no-store' };
const outcomes = ['accepted', 'declined', 'waitlisted'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!workspaceRelationalAuthorityEnabled() && !result.access.scope.work(workId)) return NextResponse.json({ error: 'Unknown Work for this organization' }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  if (!(outcomes as readonly string[]).includes(body.outcome)) return NextResponse.json({ error: 'outcome must be accepted, declined, or waitlisted' }, { status: 400, headers });
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const payload = { workId, outcome: body.outcome };
      const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'decision.record', payload, expectedRevision: body.expectedRevision });
      const decision = await workspace.recordDecision(command, payload);
      const context = await workspace.creatorDecisionContext(id, workId);
      const submitter = context ? result.access.radar.store.accounts.get(context.submitterAccountId) : undefined;
      const trackerStatus = body.outcome === 'accepted' ? 'accepted' : body.outcome === 'declined' ? 'declined' : 'waitlisted';
      let radarDirty = false;
      const projectionKey = `submission:decision:${decision.resourceId}`;
      const projectionAlreadyApplied = result.access.radar.store.emittedAlertKeys.has(projectionKey);
      if (submitter?.userId && context) {
        result.access.radar.addUserAlert({
          dedupKey: projectionKey,
          userId: submitter.userId,
          kind: 'submission-decision',
          title: `${body.outcome[0].toUpperCase()}${body.outcome.slice(1)}: ${context.workTitle}`,
          body: `The Organization recorded a ${body.outcome} decision. Open Tracker for the full receipt.`,
          reason: 'an organization updated a work in your Missa submission',
          ...(context.radarOpportunityId ? { opportunityId: context.radarOpportunityId } : {}),
        });
        radarDirty = true;
      }
      if (submitter?.userId && context?.radarOpportunityId && result.access.radar.store.opportunities.has(context.radarOpportunityId)) {
        const projectionNote = `Organization decision for Work ${workId}`;
        const tracked = result.access.radar.store.tracked.find((item) => item.userId === submitter.userId && item.opportunityId === context.radarOpportunityId);
        if (!decision.replayed || (!projectionAlreadyApplied && !tracked?.events.some((event) => event.note === projectionNote))) {
          result.access.radar.setMyStatus(submitter.userId, context.radarOpportunityId, trackerStatus, { source: 'radar', note: projectionNote });
        }
        radarDirty = true;
      }
      if (radarDirty) await persistRadar();
      return NextResponse.json({ id: decision.resourceId, workId, outcome: body.outcome, revision: decision.revision, receiptId: decision.receiptId, idempotent: decision.replayed }, { headers });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'Unable to record decision' }, { status: mapped?.status ?? 400, headers });
    }
  }
  try {
    const decision = result.access.workspace.recordDecision(id, workId, body.outcome, result.access.session.account.id);
    const work = result.access.workspace.store.works.get(workId);
    const submission = work ? result.access.workspace.store.submissions.get(work.submissionId) : undefined;
    const path = submission ? result.access.workspace.store.submissionPaths.get(submission.submissionPathId) : undefined;
    const openCall = path ? result.access.workspace.store.openCalls.get(path.openCallId) : undefined;
    const submitter = submission ? result.access.radar.store.accounts.get(submission.submitterAccountId) : undefined;
    const trackerStatus = body.outcome === 'accepted' ? 'accepted' : body.outcome === 'declined' ? 'declined' : 'waitlisted';
    if (submitter?.userId) {
      result.access.radar.addUserAlert({
        dedupKey: `submission:decision:${decision.id}`,
        userId: submitter.userId,
        kind: 'submission-decision',
        title: `${body.outcome[0].toUpperCase()}${body.outcome.slice(1)}: ${work?.title ?? 'your work'}`,
        body: `The Organization recorded a ${body.outcome} decision. Open Tracker for the full receipt.`,
        reason: 'an organization updated a work in your Missa submission',
        ...(openCall?.radarOpportunityId ? { opportunityId: openCall.radarOpportunityId } : {}),
      });
    }
    if (submitter?.userId && openCall?.radarOpportunityId && result.access.radar.store.opportunities.has(openCall.radarOpportunityId)) {
      result.access.radar.setMyStatus(submitter.userId, openCall.radarOpportunityId, trackerStatus, { source: 'radar', note: `Organization decision for Work ${workId}` });
    }
    await persistOrganizationMutation(result.access, { action: 'decision.recorded', targetType: 'work_decision', targetId: decision.id, detail: { workId, outcome: decision.outcome } });
    return NextResponse.json(decision, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record decision' }, { status: 400, headers });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!workspaceRelationalAuthorityEnabled()) return NextResponse.json({ error: 'Decision removal requires relational Workspace authority' }, { status: 409, headers });
  const body = await request.json().catch(() => ({}));
  if (typeof body.decisionId !== 'string' || !body.decisionId.trim()) return NextResponse.json({ error: 'decisionId is required' }, { status: 400, headers });
  try {
    const workspace = await getRelationalWorkspace();
    const payload = { workId, decisionId: body.decisionId };
    const command = workspaceCommandEnvelope(request, { actorAccountId: result.access.session.account.id, organizationId: id, commandType: 'decision.remove', payload, expectedRevision: body.expectedRevision });
    const removed = await workspace.removeDecision(command, body.decisionId, workId);
    return NextResponse.json({ id: removed.resourceId, workId, removed: true, revision: removed.revision, receiptId: removed.receiptId, idempotent: removed.replayed }, { headers });
  } catch (error) {
    const mapped = workspaceMutationError(error);
    return NextResponse.json(mapped?.body ?? { error: 'Unable to remove decision' }, { status: mapped?.status ?? 400, headers });
  }
}
