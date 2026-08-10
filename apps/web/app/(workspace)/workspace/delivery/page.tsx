import Link from 'next/link';
import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspaceDeliveryPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/delivery');
  if (!access.organizationId)
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">Delivery</h1>
        <p className="mt-2 text-muted-foreground">Join an organization to view delivery work.</p>
      </main>
    );
  const tasks = access.workspace.deliveryTasksForOrganization(access.organizationId).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const rows = tasks.map((task) => {
    const work = access.workspace.store.works.get(task.workId);
    const decision = access.workspace.decisionForWork(access.organizationId!, task.workId);
    return { task, work, decision };
  });
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{access.organizationName}</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">Delivery</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Track the work that follows an accepted submission. Complete means your team marked the task complete in Missa; it does not confirm that an external message or asset was delivered.</p>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">All tasks</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{tasks.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="mt-2 font-mono text-2xl text-amber-700">{tasks.filter((task) => task.status === 'pending').length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Complete</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{tasks.filter((task) => task.status === 'complete').length}</p>
        </div>
      </section>
      <section className="mt-8 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Organization delivery tasks</caption>
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Work
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Decision
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Due
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ task, work, decision }) => (
              <tr key={task.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-3 font-medium text-foreground">
                  {work?.title ?? task.workId}
                  <span className="mt-1 block font-mono text-[11px] font-normal text-muted-foreground">{task.id}</span>
                </th>
                <td className="px-4 py-3 text-muted-foreground capitalize">{decision?.outcome ?? 'No decision recorded'}</td>
                <td className={`px-4 py-3 capitalize ${task.status === 'pending' ? 'text-amber-700' : 'text-green-700'}`}>{task.status}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{task.dueDate ?? 'No due date'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{task.completedAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">No delivery tasks yet. Tasks will appear here when your team adds follow-up work to an accepted submission.</p>}
      </section>
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href={`/workspace/decisions?organizationId=${encodeURIComponent(access.organizationId)}`} className="font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
          Review decisions
        </Link>{' '}
        before changing a delivery task.
      </p>
    </main>
  );
}
