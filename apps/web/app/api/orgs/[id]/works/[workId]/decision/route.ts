import { NextResponse } from 'next/server';
import { persistOrganizationMutation, requireOrganizationAccess } from '@/lib/organizationAccess';

const headers = { 'Cache-Control': 'private, no-store' };
const outcomes = ['accepted', 'declined', 'waitlisted'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const result = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers });
  if (!result.access.scope.work(workId)) return NextResponse.json({ error: 'Unknown Work for this organization' }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  if (!(outcomes as readonly string[]).includes(body.outcome)) return NextResponse.json({ error: 'outcome must be accepted, declined, or waitlisted' }, { status: 400, headers });
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
