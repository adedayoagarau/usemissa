import Link from 'next/link';
import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspaceDecisionsPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/decisions');
  if (!access.organizationId)
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">Decisions</h1>
        <p className="mt-2 text-muted-foreground">Join an organization to view its decisions.</p>
      </main>
    );
  const decisions = access.workspace.decisionsForOrganization(access.organizationId).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  const rows = decisions.map((decision) => {
    const work = access.workspace.store.works.get(decision.workId);
    const submission = work ? access.workspace.store.submissions.get(work.submissionId) : undefined;
    const path = submission ? access.workspace.store.submissionPaths.get(submission.submissionPathId) : undefined;
    const call = path ? access.workspace.store.openCalls.get(path.openCallId) : undefined;
    return { decision, work, call };
  });
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{access.organizationName}</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">Decisions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Each decision stays with its Work. Decision email delivery is tracked separately in Messages.</p>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Total decisions</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{decisions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Accepted</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{decisions.filter((item) => item.outcome === 'accepted').length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Waitlisted</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{decisions.filter((item) => item.outcome === 'waitlisted').length}</p>
        </div>
      </section>
      <section className="mt-8 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Organization decisions</caption>
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Work
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Opportunity
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Outcome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Decided
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ decision, work, call }) => (
              <tr key={decision.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 font-medium text-foreground">
                  {work?.title ?? decision.workId}
                  <span className="mt-1 block font-mono text-[11px] font-normal text-muted-foreground">{decision.id}</span>
                </th>
                <td className="px-4 py-3 text-muted-foreground">{call?.title ?? 'Opportunity unavailable'}</td>
                <td className="px-4 py-3 text-foreground capitalize">{decision.outcome}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{decision.decidedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">No decisions are recorded for this organization yet.</p>}
      </section>
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href={`/workspace/messages?organizationId=${encodeURIComponent(access.organizationId)}`} className="font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
          Open Messages
        </Link>{' '}
        to review decision emails and delivery status.
      </p>
    </main>
  );
}
