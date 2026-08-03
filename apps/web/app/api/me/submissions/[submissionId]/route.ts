import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  const { submissionId } = await params;
  const workspace = await getWorkspaceEngine();
  const submission = workspace.store.submissions.get(submissionId);
  if (!submission || submission.submitterAccountId !== session.account.id) return NextResponse.json({ error: 'Submission not found' }, { status: 404, headers });
  const path = workspace.store.submissionPaths.get(submission.submissionPathId);
  const openCall = path ? workspace.store.openCalls.get(path.openCallId) : undefined;
  const entity = openCall ? workspace.store.entities.get(workspace.store.programs.get(openCall.programId)?.entityId ?? '') : undefined;
  const radar = await getEngine();
  const organization = entity ? radar.store.organizations.get(entity.organizationId) : undefined;
  const works = workspace.worksForSubmission(submission.id);
  const decisions = workspace.decisionsForSubmission(entity?.organizationId ?? '', submission.id);
  return NextResponse.json({ submission, path, openCall, organization: organization ? { id: organization.id, name: organization.name } : undefined, works, decisions }, { headers });
}
