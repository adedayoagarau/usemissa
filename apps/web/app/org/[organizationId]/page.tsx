import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';
import type { Metadata } from 'next';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { JsonLd, absoluteUrl, pageMetadata } from '@/lib/seo';

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

export async function generateMetadata({ params }: { params: Promise<{ organizationId: string }> }): Promise<Metadata> {
  const { organizationId } = await params;
  try {
    const radarEngine = await getEngine();
    const org = radarEngine.store.organizations.get(organizationId);
    if (!org) return pageMetadata({ title: 'Organization not found', description: 'This public Missa organization page is not available.', path: `/org/${organizationId}`, noIndex: true });
    return pageMetadata({ title: `${org.name} opportunities`, description: `Published submission opportunities from ${org.name} on Missa.`, path: `/org/${organizationId}` });
  } catch {
    return pageMetadata({ title: 'Organization opportunities', description: 'Published submission opportunities on Missa.', path: `/org/${organizationId}`, noIndex: true });
  }
}

export default async function PublicOrgPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const radarEngine = await getEngine();
  const org = radarEngine.store.organizations.get(organizationId);
  if (!org) notFound();

  const workspaceEngine = await getWorkspaceEngine();
  const openCalls = workspaceEngine.publishedOpenCallsForOrganization(organizationId);
  const linkedOpportunities = await Promise.all(openCalls.map(async (call) => call.radarOpportunityId ? getOpportunityRepository().getById(call.radarOpportunityId).catch(() => null) : null));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: org.name, url: absoluteUrl(`/org/${organizationId}`), subjectOf: { '@type': 'ItemList', itemListElement: openCalls.map((call, index) => ({ '@type': 'ListItem', position: index + 1, name: call.title, url: absoluteUrl(`/org/${organizationId}/${call.id}`) })) } }} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: `${org.name} published opportunities`, numberOfItems: openCalls.length, itemListElement: openCalls.map((call, index) => ({ '@type': 'ListItem', position: index + 1, name: call.title, url: absoluteUrl(`/org/${organizationId}/${call.id}`) })) }} />
      <h1 className="font-heading text-4xl font-medium text-foreground">{org.name}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Published calls from this organization. Read the official guidelines before applying.</p>
      <div className="mt-8 space-y-3">
        {openCalls.map((call, index) => (
          <Link
            key={call.id}
            href={`/org/${organizationId}/${call.id}`}
            className="block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
          >
            <h2 className="font-heading text-lg font-medium text-foreground">{call.title}</h2>
            {linkedOpportunities[index] && <p className="mt-1 text-xs text-muted-foreground">{linkedOpportunities[index]?.deadline.date ? `Deadline ${linkedOpportunities[index]?.deadline.date}` : linkedOpportunities[index]?.deadline.raw ?? 'Deadline to be confirmed'} · {linkedOpportunities[index]?.fee.status === 'no-fee' ? 'No fee' : linkedOpportunities[index]?.fee.status === 'paid' ? 'Paid submission' : 'Fee not confirmed'}</p>}
            <span className="text-sm text-primary">View & submit →</span>
          </Link>
        ))}
        {openCalls.length === 0 && <p className="text-muted-foreground">No open calls right now.</p>}
      </div>
    </main>
  );
}
