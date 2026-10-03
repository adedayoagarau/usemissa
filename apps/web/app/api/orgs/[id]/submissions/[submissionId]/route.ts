import { NextResponse } from 'next/server';
import {
  callerReviewAssignmentsForSubmission,
  organizationAccessCan,
  ORGANIZATION_ROLE_FORBIDDEN,
  requireOrganizationAccess,
} from '@/lib/organizationAccess';

/** Story 7.1: "clicking a Submission shows its Works and uploaded files."
 *
 * Holders of `submissions.read` receive the full dossier. Any other member
 * receives only a Submission assigned to them for review, with their own
 * assignments and recommendations — never other reviewers' recommendations,
 * decisions, or delivery work, so blind review holds. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  const result = await requireOrganizationAccess(request, id, { capability: 'organization.read' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const fullDossier = organizationAccessCan(result.access, 'submissions.read');
  const ownAssignments = fullDossier ? [] : callerReviewAssignmentsForSubmission(result.access, submissionId);
  // Deny before the lookup so a non-holder cannot probe which Submissions exist.
  if (!fullDossier && ownAssignments.length === 0) return NextResponse.json({ error: ORGANIZATION_ROLE_FORBIDDEN }, { status: 403 });

  const engine = result.access.workspace;
  const scopedSubmission = result.access.scope.submission(submissionId);
  const submission = scopedSubmission
    ? engine.submissionsForOrganization(id).find((candidate) => candidate.id === scopedSubmission.id)
    : undefined;
  if (!submission) return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });

  const works = engine.worksForSubmission(submissionId);
  const assignments = fullDossier ? engine.reviewAssignmentsForSubmission(submissionId) : ownAssignments;
  const reviewAssignments = assignments.map((a) => ({
    ...a,
    recommendation: engine.recommendationForAssignment(a.id),
  }));
  const decisions = fullDossier ? engine.decisionsForSubmission(id, submissionId) : [];
  const deliveryTasks = fullDossier ? engine.deliveryTasksForOrganization(id).filter((task) => works.some((work) => work.id === task.workId)) : [];

  return NextResponse.json({ submission, works, reviewAssignments, decisions, deliveryTasks }, { headers: { 'Cache-Control': 'private, no-store' } });
}
