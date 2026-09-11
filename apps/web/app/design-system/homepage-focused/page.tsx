import type { Metadata } from "next";
import { HomepageHeroPreview } from "@/components/design-system/homepage-hero-preview";
import { HomepageNextOpening } from "@/components/missa/homepage-next-opening";
import {
  HomepageContinuation,
  HomepageFooter,
} from "@/components/missa/homepage-continuation";

export const metadata: Metadata = {
  title: "Missa — Homepage composition preview",
  robots: { index: false, follow: false },
};

export default function HomepageFocusedPreview() {
  return (
    <>
      <main>
        <HomepageHeroPreview />
        <HomepageNextOpening layout="compact" />
        <HomepageContinuation layout="focused" />
      </main>
      <HomepageFooter />
    </>
  );
}
