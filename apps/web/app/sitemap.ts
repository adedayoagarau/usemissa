import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  return [
    { url: `${baseUrl}/waitlist`, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.25 },
  ];
}
