import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { ReviewForm } from '@/components/review-form';

/**
 * Story 7.2/7.3: a reviewer's own dashboard -- "the assigned reviewer sees
 * only their assigned Submissions." Not organization-scoped in the URL
 * (unlike /submissions) since a reviewer can be assigned across orgs.
 */
export default async function ReviewerPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  const workspaceEngine = await getWorkspaceEngine();
  const assignments = workspaceEngine.reviewAssignmentsForReviewer(session.account.id).map((a) => ({
    ...a,
    works: workspaceEngine.worksForSubmission(a.submissionId),
    recommendation: workspaceEngine.recommendationForAssignment(a.id),
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-heading text-3xl font-medium text-foreground">Your reviews</h1>
      <div className="mt-6 space-y-3">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="font-medium text-foreground">{a.works.map((w) => w.title).join(', ')}</p>
            {a.completedAt ? (
              <p className="mt-1 text-sm text-[var(--green)]">
                Reviewed — score {a.recommendation?.score ?? '—'}
                {a.recommendation?.notes ? `: ${a.recommendation.notes}` : ''}
              </p>
            ) : (
              <ReviewForm assignmentId={a.id} />
            )}
          </div>
        ))}
        {assignments.length === 0 && <p className="text-muted-foreground">Nothing assigned to you yet.</p>}
      </div>
    </main>
  );
}
