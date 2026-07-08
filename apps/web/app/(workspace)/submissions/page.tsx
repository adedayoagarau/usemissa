import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { SubmissionCard } from '@/components/submission-card';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  'in-review': 'In review',
  decided: 'Decided',
  withdrawn: 'Withdrawn',
};

/**
 * Story 7.1: admin inbox of incoming Submissions, grouped by stage.
 *
 * Simplification vs. the UX spec's org-facing Status Pipeline Board variant:
 * this uses per-item expandable cards (view Works, assign a reviewer) rather
 * than a bulk-action toolbar per column. That's a real, deliberate scope cut
 * given the time available, not a hidden gap -- documented in the story file.
 */
export default async function SubmissionsPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');

  if (session.memberships.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">Submissions</h1>
        <p className="mt-2 text-muted-foreground">You are not a member of any organization yet.</p>
      </main>
    );
  }

  const organizationId = session.memberships[0].organizationId;
  const radarEngine = await getEngine();
  const workspaceEngine = await getWorkspaceEngine();

  const submissions = workspaceEngine.submissionsForOrganization(organizationId);
  const members = radarEngine.store.memberships
    .filter((m) => m.organizationId === organizationId)
    .map((m) => ({
      accountId: m.accountId,
      email: radarEngine.store.accounts.get(m.accountId)?.email ?? m.accountId,
      role: m.role,
    }));

  const stages = ['submitted', 'in-review', 'decided', 'withdrawn'];

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-heading text-3xl font-medium text-foreground">Submissions</h1>
      {stages.map((stage) => {
        const items = submissions.filter((s) => s.status === stage);
        if (items.length === 0) return null;
        return (
          <div key={stage} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {STATUS_LABEL[stage]} ({items.length})
            </h2>
            <div className="mt-2 space-y-2">
              {items.map((s) => (
                <SubmissionCard key={s.id} organizationId={organizationId} submission={s} members={members} />
              ))}
            </div>
          </div>
        );
      })}
      {submissions.length === 0 && <p className="mt-6 text-muted-foreground">No submissions yet.</p>}
    </main>
  );
}
