import { discoveryCollections } from "@/lib/discoveryGuides";
import { getPublicProfileCountryCounts } from "@/lib/publicProfileReads";
import type { SitemapEntry } from "@/lib/sitemapData";
import { sitemapUrlset, xmlResponse } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/opportunities",
  "/directory",
  "/journals",
  "/residencies",
  "/grants",
  "/presses",
  "/countries",
  "/rankings/magazines",
  "/rankings/residencies",
  "/rankings/methodology",
  "/rankings/compare",
  "/discover/match",
  "/about",
  "/methodology",
  "/for-organizations",
  "/waitlist",
  "/rankings/plan",
  "/rankings/claim",
  "/terms",
  "/privacy",
];

/**
 * Country hubs that have publishers to show, from the same cached aggregate
 * the /countries index uses. A failed read drops the hubs rather than the
 * whole sitemap.
 */
async function countryHubEntries(): Promise<SitemapEntry[] | null> {
  try {
    const counts = await getPublicProfileCountryCounts();
    return [
      { path: "/countries/global" },
      ...counts
        .filter(({ countryCode, count }) => countryCode && count > 0)
        .map(({ countryCode }) => ({
          path: `/countries/${countryCode.toLowerCase()}`,
        })),
    ];
  } catch {
    return null;
  }
}

export async function GET() {
  const countryHubs = await countryHubEntries();
  const entries = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...discoveryCollections.map((collection) => ({
      path: `/discover/${collection.slug}`,
    })),
    ...(countryHubs ?? []),
  ];
  return xmlResponse(sitemapUrlset(entries), { degraded: !countryHubs });
}
