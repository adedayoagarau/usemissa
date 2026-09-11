import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import {
  HomepageContinuation,
  HomepageFooter,
} from "@/components/missa/homepage-continuation";
import { HomepageHeroPreview } from "@/components/design-system/homepage-hero-preview";
import { HomepageNextOpening } from "@/components/missa/homepage-next-opening";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Missa — Opportunities for every creator",
  description:
    "Find open calls, grants, residencies and places to share your work.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  return (
    <>
      <main>
        <HomepageHeroPreview exploreHref="#next-opening" />
        <HomepageNextOpening />
        <HomepageContinuation signedIn={Boolean(session)} />
      </main>
      <HomepageFooter />
    </>
  );
}
