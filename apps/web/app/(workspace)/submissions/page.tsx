import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionAccountFromToken, SESSION_COOKIE } from '@/lib/auth';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import { SubmissionCard } from '@/components/submission-card';
import Link from 'next/link';

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
export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; organizationId?: string }> }) {
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

  const filters = await searchParams;
  const organizationId = session.memberships.find((membership) => membership.organizationId === filters.organizationId)?.organizationId ?? session.memberships[0].organizationId;
  if (filters.organizationId !== organizationId) {
    const params = new URLSearchParams({ organizationId });
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    redirect(`/submissions?${params.toString()}`);
  }
  const radarEngine = await getEngine();
  const workspaceEngine = await getWorkspaceEngine();

  const submissions = workspaceEngine.submissionsForOrganization(organizationId);
  const query = filters.q?.trim().toLowerCase() ?? '';
  const statusFilter = filters.status && ['submitted', 'in-review', 'decided', 'withdrawn'].includes(filters.status) ? filters.status : '';
  const visibleSubmissions = submissions.filter((submission) => {
    const matchesStatus = !statusFilter || submission.status === statusFilter;
    const matchesQuery = !query || submission.openCallTitle.toLowerCase().includes(query) || submission.openCallId.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });
  const reporting = workspaceEngine.reportingForOrganization(organizationId);
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
      <form className="mt-5 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3" method="get">
        {filters.organizationId && <input type="hidden" name="organizationId" value={filters.organizationId} />}
        <label className="min-w-56 flex-1 text-xs font-medium text-muted-foreground">Search open calls<input name="q" defaultValue={filters.q ?? ''} placeholder="Search by call name" className="mt-1 h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-foreground" /></label>
        <label className="text-xs font-medium text-muted-foreground">Status<select name="status" defaultValue={statusFilter} className="mt-1 h-11 rounded-md border border-input bg-white px-3 text-sm text-foreground"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="in-review">In review</option><option value="decided">Decided</option><option value="withdrawn">Withdrawn</option></select></label>
        <button className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" type="submit">Filter</button>
        {(query || statusFilter) && <Link href={filters.organizationId ? `/submissions?organizationId=${encodeURIComponent(filters.organizationId)}` : '/submissions'} className="min-h-11 rounded-md border border-border px-4 py-2 text-sm text-foreground">Clear</Link>}
      </form>
      <section aria-label="Submission insights" className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-wrap gap-6 text-sm"><span><b className="block font-mono text-xl">{reporting.submissions}</b>submissions</span><span><b className="block font-mono text-xl">{Math.round(reporting.conversionRate * 100)}%</b>accepted</span><span><b className="block font-mono text-xl">{reporting.medianDaysToDecision ?? '—'}</b>median days to decision</span></div><a className="min-h-11 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted" href={`/api/orgs/${organizationId}/insights/export`}>Export CSV</a></div>
      </section>
      {stages.map((stage) => {
        const items = visibleSubmissions.filter((s) => s.status === stage);
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
      {submissions.length > 0 && visibleSubmissions.length === 0 && <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No submissions match these filters.</p>}
    </main>
  );
}
