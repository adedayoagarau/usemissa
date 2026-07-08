import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/** Story 7.2: "the assigned reviewer sees only their assigned Submissions."
 * reviewerAccountId is the caller's own Account.id, not the :id route-param
 * pattern used elsewhere -- there's no org/self id in this URL by design,
 * since a reviewer can be assigned across multiple organizations. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const engine = getWorkspaceEngine();
  const assignments = engine.reviewAssignmentsForReviewer(session.account.id).map((a) => ({
    ...a,
    submission: engine.store.submissions.get(a.submissionId),
    works: engine.worksForSubmission(a.submissionId),
    recommendation: engine.recommendationForAssignment(a.id),
  }));

  return NextResponse.json(assignments);
}
