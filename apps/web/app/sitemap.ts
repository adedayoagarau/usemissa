import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { discoveryCollections } from '@/lib/discoveryGuides';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  const collectionEntries = discoveryCollections.map((col) => ({
    url: `${baseUrl}/discover/${col.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    { url: `${baseUrl}/opportunities`, changeFrequency: 'daily', priority: 0.9 },
    ...collectionEntries,
    { url: `${baseUrl}/waitlist`, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.25 },
  ];
}

