import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
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
  title: "Missa — Opportunities for every creator",
  description:
    "Find open calls, grants, residencies and places to share your work.",
  path: "/",
});

export const dynamic = "force-dynamic";

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
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  const [initialCalls, initialOrganizations] = session
    ? [null, null]
    : await Promise.all([
        currentCalls(),
        getHomepageOrganizations().catch((): HomepageOrganization[] => []),
      ]);
  return (
    <>
      <main>
        <HomepageHero />
        <HomepageNextOpening />
        <HomepageContinuation
          signedIn={Boolean(session)}
          initialCalls={initialCalls}
          initialOrganizations={initialOrganizations}
        />
      </main>
      <HomepageFooter />
      <StickyMobileCta anchorId="homepage-primary-cta" href="/opportunities">
        Browse opportunities
      </StickyMobileCta>
    </>
  );
}
