import {
  HomepageContinuation,
  HomepageFooter,
} from "@/components/missa/homepage-continuation";
import { HomepageHero } from "@/components/missa/homepage-hero";
import { HomepageNextOpening } from "@/components/missa/homepage-next-opening";
import { StickyMobileCta } from "@/components/missa/sticky-mobile-cta";
import { pageMetadata } from "@/lib/seo";
import { getPublicOpportunityPage } from "@/lib/publicOpportunityReads";
import { selectHomepageCalls, type HomepageCall } from "@/lib/homepageCalls";
import {
  getHomepageOrganizations,
  type HomepageOrganization,
} from "@/lib/homepageOrganizations";

export const metadata = pageMetadata({
  title: "Missa: open calls, grants and residencies",
  description:
    "Open calls, grants, residencies and magazines, each with its fee, who can apply and the organizer's page. Save the ones you want and get reminded before they close.",
  path: "/",
});

/**
 * Served from the CDN and regenerated at most every five minutes, the same
 * lifetime as the cached catalogue reads below. Nothing here depends on the
 * visitor: signed-in state loads in the browser, and the strip refreshes
 * itself with the visitor's own saved state once it scrolls into view.
 */
export const revalidate = 300;

/**
 * The homepage strip must not open on a skeleton: the calls are the first
 * proof the catalogue is alive. Rendering them with the page removes the
 * client fetch from the critical path, and the repository's own cache keeps
 * the extra query off most requests.
 */
async function currentCalls(): Promise<HomepageCall[] | null> {
  try {
    const result = await getPublicOpportunityPage({
      openNow: true,
      sort: "soonest-deadline",
      limit: 12,
    });
    const items = result.items.map(
      ({
        createdAt: _createdAt,
        simultaneousAllowed: _simultaneousAllowed,
        ...item
      }) => item,
    ) as HomepageCall[];
    const selected = selectHomepageCalls(items, 3);
    return selected.length ? selected : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [initialCalls, initialOrganizations] = await Promise.all([
    currentCalls(),
    getHomepageOrganizations().catch((): HomepageOrganization[] => []),
  ]);
  return (
    <>
      <main>
        <HomepageHero />
        <HomepageNextOpening />
        <HomepageContinuation
          initialCalls={initialCalls}
          initialOrganizations={initialOrganizations}
        />
      </main>
      <HomepageFooter />
      <StickyMobileCta anchorId="homepage-primary-cta" href="/opportunities">
        Browse open calls
      </StickyMobileCta>
    </>
  );
}
