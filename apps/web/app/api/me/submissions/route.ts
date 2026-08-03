import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const workspace = await getWorkspaceEngine();
  const radar = await getEngine();
  const submissions = [...workspace.store.submissions.values()]
    .filter((submission) => submission.submitterAccountId === session.account.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((submission) => {
      const path = workspace.store.submissionPaths.get(submission.submissionPathId);
      const openCall = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
      const entity = openCall ? workspace.store.entities.get(workspace.store.programs.get(openCall.programId)?.entityId ?? '') : undefined;
      const organization = entity ? radar.store.organizations.get(entity.organizationId) : undefined;
      return { ...submission, works: workspace.worksForSubmission(submission.id), openCallTitle: openCall?.title ?? 'Submission', organizationName: organization?.name, organizationId: entity?.organizationId };
    });
  return NextResponse.json({ submissions }, { headers });
}
