import Link from 'next/link';
import { getWorkspacePageAccess } from '@/lib/workspacePage';

export default async function WorkspaceMessagesPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const access = await getWorkspacePageAccess(searchParams, 'workspace/messages');
  if (!access.organizationId)
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-medium text-foreground">Messages</h1>
        <p className="mt-2 text-muted-foreground">Join an organization to view communication activity.</p>
      </main>
    );
  const alerts = [...access.radar.store.alerts.values()].filter((alert) => alert.audience === 'organization' && alert.organizationId === access.organizationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const batches = access.radar.store.auditLog.filter((entry) => entry.targetType === 'organization' && entry.targetId === access.organizationId && entry.action === 'decision.email.batch_sent').sort((a, b) => b.at.localeCompare(a.at));
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{access.organizationName}</p>
        <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-foreground">Messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">See organization updates and decision-email activity. This view records when a batch was created; it does not display message text, recipients, or delivery-provider details.</p>
      </header>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Organization updates</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{alerts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Decision-email batches</p>
          <p className="mt-2 font-mono text-2xl text-foreground">{batches.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted-foreground">Delivery detail</p>
          <p className="mt-2 text-sm font-medium text-amber-700">Limited</p>
          <p className="mt-1 text-xs text-muted-foreground">Provider delivery history is not shown here</p>
        </div>
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-heading text-xl font-medium text-foreground">Decision-email activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">Date and batch reference.</p>
          </div>
          <ul className="divide-y divide-border">
            {batches.map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">Decision-email batch created</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {entry.at} · {entry.id}
                </p>
              </li>
            ))}
            {batches.length === 0 && <li className="px-4 py-8 text-sm text-muted-foreground">No decision-email activity yet. Batches will appear here after your team sends decisions.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-4 py-4">
            <h2 className="font-heading text-xl font-medium text-foreground">Organization updates</h2>
            <p className="mt-1 text-xs text-muted-foreground">Updates created for your organization.</p>
          </div>
          <ul className="divide-y divide-border">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">{alert.kind.replaceAll('-', ' ')}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {alert.createdAt} · {alert.read ? 'read' : 'unread'}
                </p>
              </li>
            ))}
            {alerts.length === 0 && <li className="px-4 py-8 text-sm text-muted-foreground">No organization updates yet. New updates will appear here when they are created.</li>}
          </ul>
        </div>
      </section>
      <p className="mt-6 text-xs text-muted-foreground">
        <Link href={`/workspace/delivery?organizationId=${encodeURIComponent(access.organizationId)}`} className="font-medium text-accent-deep underline decoration-accent-tint underline-offset-4">
          Review delivery tasks
        </Link>{' '}
        for work that follows an accepted submission.
      </p>
    </main>
  );
}
