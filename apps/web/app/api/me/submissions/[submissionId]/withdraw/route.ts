import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getRelationalWorkspace, getWorkspaceEngine, persistWorkspace, workspaceCommandEnvelope, workspaceMutationError, workspaceRelationalAuthorityEnabled } from '@/lib/workspaceEngine';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { submissionId } = await params;
  if (workspaceRelationalAuthorityEnabled()) {
    try {
      const workspace = await getRelationalWorkspace();
      const prior = await workspace.submissionForOwner(session.account.id, submissionId);
      if (!prior) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      const payload = { submissionId };
      const command = workspaceCommandEnvelope(request, { actorAccountId: session.account.id, ownerAccountId: session.account.id, commandType: 'submission.withdraw', payload, expectedRevision: (await request.clone().json().catch(() => ({})) as { expectedRevision?: unknown }).expectedRevision });
      const withdrawn = await workspace.withdrawSubmission(command, submissionId);
      const opportunityId = typeof prior.radarOpportunityId === 'string' ? prior.radarOpportunityId : undefined;
      if (session.account.userId && opportunityId) {
        const radar = await getEngine();
        if (radar.store.opportunities.has(opportunityId)) {
          radar.setMyStatus(session.account.userId, opportunityId, 'withdrawn', { source: 'user', note: `Missa submission ${submissionId}` });
          await persistRadar();
        }
      }
      return NextResponse.json({ ...prior, status: 'withdrawn', revision: withdrawn.revision, receiptId: withdrawn.receiptId, idempotent: withdrawn.replayed });
    } catch (error) {
      const mapped = workspaceMutationError(error);
      return NextResponse.json(mapped?.body ?? { error: error instanceof Error ? error.message : 'Could not withdraw submission' }, { status: mapped?.status ?? 409 });
    }
  }
  const workspace = await getWorkspaceEngine();
  try {
    const submission = workspace.withdrawSubmission(submissionId, session.account.id);
    await persistWorkspace();
    const path = workspace.store.submissionPaths.get(submission.submissionPathId);
    const call = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
    if (session.account.userId && call?.radarOpportunityId) {
      const radar = await getEngine();
      if (radar.store.opportunities.has(call.radarOpportunityId)) {
        radar.setMyStatus(session.account.userId, call.radarOpportunityId, 'withdrawn', { source: 'user', note: `Missa submission ${submission.id}` });
        await persistRadar();
      }
    }
    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not withdraw submission' }, { status: 409 });
  }
}
