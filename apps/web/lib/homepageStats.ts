import { unstable_cache } from "next/cache";
import { getOpportunityFacetCounts } from "@/lib/opportunityFacetCounts";
import { getProfileRepository } from "@/lib/profileRepository";

export interface HomepageStats {
  open: number;
  residencies: number;
  grants: number;
  organizations: number;
}

/**
 * Homepage totals, shared by the API route and the server-rendered page so
 * both read the same cache entry instead of the page triggering a second
 * aggregate on every request.
 */
export const getHomepageStats = unstable_cache(
  async (): Promise<HomepageStats> => {
    const profiles = getProfileRepository();
    const [opportunities, organizations] = await Promise.all([
      getOpportunityFacetCounts({
        sort: "soonest-deadline",
        limit: 1,
        openNow: true,
        types: [],
        disciplines: [],
        genres: [],
        locations: [],
      }),
      profiles?.browse({ limit: 1, offset: 0 }),
    ]);
    const typeCounts = new Map(
      opportunities.types.map((item) => [item.value, item.count]),
    );

    return {
      open: opportunities.total,
      residencies: typeCounts.get("residency") ?? 0,
      grants: typeCounts.get("grant") ?? 0,
      organizations: organizations?.total ?? 0,
    };
  },
  ["public-homepage-stats-v1"],
  { revalidate: 300, tags: ["opportunities", "organizations"] },
);
