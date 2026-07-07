import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

/**
 * Story 6.4: public organization page -- no auth required. Only published
 * Open Calls are ever visible here (draft calls never reach unauthenticated
 * visitors, per the AC).
 *
 * force-dynamic: this page doesn't read cookies/headers, so without this
 * Next.js renders it once on first request and caches that HTML for every
 * subsequent visitor -- a real bug found while smoke-testing this story
 * (publishing a call had no visible effect on the public page until this
 * was added). The org's open calls change whenever an admin publishes one,
 * so this must never be served from a stale cache.
 */
export const dynamic = 'force-dynamic';

export default async function PublicOrgPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const radarEngine = await getEngine();
  const org = radarEngine.store.organizations.get(organizationId);
  if (!org) notFound();

  const workspaceEngine = getWorkspaceEngine();
  const openCalls = workspaceEngine.publishedOpenCallsForOrganization(organizationId);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-4xl font-medium text-foreground">{org.name}</h1>
      <div className="mt-8 space-y-3">
        {openCalls.map((call) => (
          <Link
            key={call.id}
            href={`/org/${organizationId}/${call.id}`}
            className="block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
          >
            <h2 className="font-heading text-lg font-medium text-foreground">{call.title}</h2>
            <span className="text-sm text-primary">View & submit →</span>
          </Link>
        ))}
        {openCalls.length === 0 && <p className="text-muted-foreground">No open calls right now.</p>}
      </div>
    </main>
  );
}
