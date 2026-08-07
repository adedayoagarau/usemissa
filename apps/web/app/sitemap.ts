import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { discoveryCollections, discoveryGuides } from '@/lib/discoveryGuides';
import { getEngine } from '@/lib/engine';
import { getWorkspaceEngine } from '@/lib/workspaceEngine';

// Keep the database-backed URL inventory out of the deployment build. Vercel
// can serve this route on demand while the static discovery URLs remain
// available even if the repository is warming up.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/opportunities-preview`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/for-organizations`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/guides`, changeFrequency: 'weekly', priority: 0.8 },
    ...discoveryGuides.map((guide) => ({ url: `${baseUrl}/guides/${guide.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...discoveryCollections.map((collection) => ({ url: `${baseUrl}/discover/${collection.slug}`, changeFrequency: 'daily' as const, priority: 0.75 })),
  ];

  // Keep the sitemap useful even while a database is unavailable during a
  // build. At runtime, publish a bounded rolling window of the same public
  // opportunity records that power the browse surface.
  try {
    let cursor: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const result = await getOpportunityRepository().browse({ openNow: true, sort: 'soonest-deadline', limit: 48, ...(cursor ? { cursor } : {}) });
      entries.push(...result.items.map((item) => ({
        url: `${baseUrl}/discover/opportunities/${item.slug}`,
        lastModified: item.source.processingSucceededAt ? new Date(item.source.processingSucceededAt) : undefined,
        changeFrequency: 'daily' as const,
        priority: 0.65,
      })));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
  } catch {
    // Static discovery and guide URLs remain valid if the runtime store is
    // unavailable; do not turn /sitemap.xml into a 500.
  }

  try {
    const radarEngine = await getEngine();
    const workspaceEngine = await getWorkspaceEngine();
    for (const organization of radarEngine.store.organizations.values()) {
      const calls = workspaceEngine.publishedOpenCallsForOrganization(organization.id);
      if (calls.length === 0) continue;
      entries.push({ url: `${baseUrl}/org/${organization.id}`, changeFrequency: 'weekly', priority: 0.55 });
      entries.push(...calls.map((call) => ({ url: `${baseUrl}/org/${organization.id}/${call.id}`, lastModified: call.publishedAt ? new Date(call.publishedAt) : undefined, changeFrequency: 'weekly' as const, priority: 0.5 })));
    }
  } catch {
    // Organization pages are additive to the core sitemap and may be absent
    // while the compatibility workspace store is warming up.
  }

  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
