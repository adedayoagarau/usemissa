import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { reviewerAssignmentForAccount, reviewerAssignmentsForAccount } from '@/lib/reviewerProduct';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { ReviewerEvidenceDesk } from '@/components/reviewer-evidence-desk';

export default async function ReviewAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const session = await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/reviews/${assignmentId}`)}`);
  const [workspace, radar] = await Promise.all([getWorkspaceEngine(), getEngine()]);
  const assignment = reviewerAssignmentForAccount(workspace, radar, session.account.id, assignmentId);
  if (!assignment) notFound();
  const queue = reviewerAssignmentsForAccount(workspace, radar, session.account.id);
  return <ReviewerEvidenceDesk assignment={assignment} queue={queue} />;
}
