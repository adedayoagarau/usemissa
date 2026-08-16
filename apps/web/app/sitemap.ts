import type { MetadataRoute } from 'next';
import { readUserHandle } from '@missa/radar-adapters';
import { isPublicProfileIndexable } from '@missa/radar-engine';
import { getEngine } from '@/lib/engine';
import { siteUrl } from '@/lib/siteUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/waitlist`, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.25 },
  ];
  if (!process.env.DATABASE_URL) return staticEntries;

  const engine = await getEngine();
  const profiles = await Promise.all(
    [...engine.store.users.values()].map(async (user) => {
      if (!user.publicProfilePublishedAt) return undefined;
      const profile = engine.publicUserProfile(user.id);
      if (!profile || !isPublicProfileIndexable(profile)) return undefined;
      const handle = await readUserHandle(process.env.DATABASE_URL!, user.id).catch(() => null);
      if (!handle) return undefined;
      return {
        url: `${baseUrl}/@${encodeURIComponent(handle.displayHandle.replace(/^@/u, ''))}`,
        lastModified: new Date(user.publicProfilePublishedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      };
    }),
  );
  return [...staticEntries, ...profiles.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))];
}
