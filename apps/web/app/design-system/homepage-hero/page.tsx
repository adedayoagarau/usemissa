import type { Metadata } from "next";

import { HomepageHeroPreview } from "@/components/design-system/homepage-hero-preview";

export const metadata: Metadata = {
  title: "Homepage hero · Missa design review",
  description:
    "Local-only H1: VanMoof-density knit studio plate. Type is a caption.",
  robots: { index: false, follow: false },
};

export default function HomepageHeroPage() {
  return <HomepageHeroPreview />;
}
