import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine, persistWorkspace } from '@/lib/workspaceEngine';
import { getEngine, persistRadar } from '@/lib/engine';

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { submissionId } = await params;
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
