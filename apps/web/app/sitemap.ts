import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';
import { discoveryCollections } from '@/lib/discoveryGuides';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  const publicPages = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/directory', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/countries', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/journals', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/residencies', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/grants', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/presses', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/rankings/magazines', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/rankings/residencies', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/rankings/compare', changeFrequency: 'weekly' as const, priority: 0.65 },
    { path: '/rankings/methodology', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/discover/match', changeFrequency: 'monthly' as const, priority: 0.75 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/for-organizations', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/methodology', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.25 },
  ].map((entry) => ({ ...entry, url: `${baseUrl}${entry.path}` }));
  const collectionEntries = discoveryCollections.map((col) => ({
    url: `${baseUrl}/discover/${col.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    ...publicPages,
    { url: `${baseUrl}/opportunities`, changeFrequency: 'daily', priority: 0.9 },
    ...collectionEntries,
    { url: `${baseUrl}/waitlist`, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.25 },
  ];
}
