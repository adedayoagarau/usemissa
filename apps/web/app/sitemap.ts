import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { getOpportunityRepository } from '@/lib/opportunityRepository';
import { discoveryCollections, discoveryGuides } from '@/lib/discoveryGuides';

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
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/methodology`, changeFrequency: 'monthly', priority: 0.7 },
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

  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
