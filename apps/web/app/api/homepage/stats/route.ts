import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getOpportunityFacetCounts } from "@/lib/opportunityFacetCounts";
import { getProfileRepository } from "@/lib/profileRepository";

const getCachedHomepageStats = unstable_cache(async () => {
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
}, ["public-homepage-stats-v1"], {
  revalidate: 300,
  tags: ["opportunities", "organizations"],
});

export async function GET() {
  return NextResponse.json(
    await getCachedHomepageStats(),
    {
      headers: {
        "cache-control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
