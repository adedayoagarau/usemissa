import { NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/** Story 7.1: "clicking a Submission shows its Works and uploaded files." */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  const auth = await requireOrgMember(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const engine = getWorkspaceEngine();
  const submission = engine.submissionsForOrganization(id).find((s) => s.id === submissionId);
  if (!submission) return NextResponse.json({ error: 'Unknown submission for this organization' }, { status: 404 });

  const works = engine.worksForSubmission(submissionId);
  const reviewAssignments = engine.reviewAssignmentsForSubmission(submissionId).map((a) => ({
    ...a,
    recommendation: engine.recommendationForAssignment(a.id),
  }));

  return NextResponse.json({ submission, works, reviewAssignments });
}
