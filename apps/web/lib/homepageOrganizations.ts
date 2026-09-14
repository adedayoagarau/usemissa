import { getPublicProfilesByNames } from "@/lib/publicProfileReads";

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
 * Resolve the featured organizations server-side in one cached database pass.
 */
export async function getHomepageOrganizations(): Promise<
  HomepageOrganization[]
> {
  const profiles = await getPublicProfilesByNames(HOMEPAGE_ORGANIZATION_NAMES);
  return profiles.map((profile) => ({
    name: profile.name,
    slug: profile.slug,
    kind: profile.kind,
    mediaUrl: profile.mediaUrl,
    mediaAlt: profile.mediaAlt,
    city: profile.city,
    country: profile.country,
  }));
}
