import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

/** Story 7.1: "clicking a Submission shows its Works and uploaded files." */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  const result = await requireOrganizationAccess(request, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const engine = result.access.workspace;
  const scopedSubmission = result.access.scope.submission(submissionId);
  const submission = scopedSubmission
    ? engine.submissionsForOrganization(id).find((candidate) => candidate.id === scopedSubmission.id)
    : undefined;
  if (!submission) return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });

  const works = engine.worksForSubmission(submissionId);
  const reviewAssignments = engine.reviewAssignmentsForSubmission(submissionId).map((a) => ({
    ...a,
    recommendation: engine.recommendationForAssignment(a.id),
  }));
  const decisions = engine.decisionsForSubmission(id, submissionId);
  const deliveryTasks = engine.deliveryTasksForOrganization(id).filter((task) => works.some((work) => work.id === task.workId));

  return NextResponse.json({ submission, works, reviewAssignments, decisions, deliveryTasks }, { headers: { 'Cache-Control': 'private, no-store' } });
}
