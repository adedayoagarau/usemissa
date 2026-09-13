import { getProfileRepository } from "@/lib/profileRepository";

/**
 * Organizations the homepage features. Kept here so the server prefetch and
 * the client refresh search the same names.
 */
export const HOMEPAGE_ORGANIZATION_NAMES = [
  "MacDowell",
  "Headlands Center for the Arts",
  "The Paris Review",
  "Yaddo",
  "BOMB Magazine",
  "Poetry Foundation",
];

export interface HomepageOrganization {
  name: string;
  slug: string;
  kind: string;
  mediaUrl?: string | null;
  mediaAlt?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * Resolve the featured organizations server-side. Each name is an exact
 * match, so one query per name is enough and they run in parallel; the client
 * previously made the same six requests after hydration.
 */
export async function getHomepageOrganizations(): Promise<
  HomepageOrganization[]
> {
  const repository = getProfileRepository();
  if (!repository) return [];
  const settled = await Promise.allSettled(
    HOMEPAGE_ORGANIZATION_NAMES.map(async (name) => {
      const result = await repository.browse({
        query: name,
        nameOnly: true,
        limit: 48,
      });
      return result.items.find(
        (profile) => profile.name.toLowerCase() === name.toLowerCase(),
      );
    }),
  );
  return settled.flatMap((entry) => {
    if (entry.status !== "fulfilled" || !entry.value) return [];
    const profile = entry.value;
    return [
      {
        name: profile.name,
        slug: profile.slug,
        kind: profile.kind,
        mediaUrl: profile.mediaUrl,
        mediaAlt: profile.mediaAlt,
        city: profile.city,
        country: profile.country,
      },
    ];
  });
}
