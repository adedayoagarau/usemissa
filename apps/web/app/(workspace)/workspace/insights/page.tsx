import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspaceInsightsPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/insights');
  if (!access.organizationId)
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">Insights</h1>
        <p className="mt-2 text-muted-foreground">Join an organization to view workflow insights.</p>
      </main>
    );
  const reporting = access.workspace.reportingForOrganization(access.organizationId);
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{access.organizationName}</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">Insights</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A current snapshot of your submission workflow. These numbers update as submissions and decisions are recorded in Missa.</p>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Submissions</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{reporting.submissions}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Decisions</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{reporting.decisions}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Accepted</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{reporting.accepted}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Acceptance rate</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{reporting.decisions ? `${Math.round(reporting.conversionRate * 100)}%` : '—'}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Median decision time</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{reporting.medianDaysToDecision ?? '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">days</p>
        </div>
      </section>
      <section className="mt-8 rounded-xl border border-border bg-white p-5">
        <h2 className="font-heading text-xl font-medium text-foreground">Submissions by month</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="sr-only">Monthly organization submissions</caption>
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">
                  Month
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody>
              {reporting.byMonth.map((row) => (
                <tr key={row.month} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-3 font-mono text-xs font-normal text-foreground">
                    {row.month}
                  </th>
                  <td className="px-3 py-3 font-mono text-foreground">{row.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reporting.byMonth.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No dated submissions yet. This table will fill as submissions are received.</p>}
      </section>
    </main>
  );
}
