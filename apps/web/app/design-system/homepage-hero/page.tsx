import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import {
  HomepageContinuation,
  HomepageFooter,
} from "@/components/missa/homepage-continuation";
import { HomepageNextOpening } from "@/components/missa/homepage-next-opening";
import type { Metadata } from "next";

import { HomepageHeroPreview } from "@/components/design-system/homepage-hero-preview";

export const metadata: Metadata = {
  title: "Homepage hero · Missa design review",
  description:
    "Local-only H1: VanMoof-density knit studio plate. Type is a caption.",
  robots: { index: false, follow: false },
};

export default async function HomepageHeroPage() {
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
