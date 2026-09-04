import type { Metadata } from "next";

import { OpportunitiesBrowseHub } from "@/components/design-system/opportunities-browse-hub";

export const metadata: Metadata = {
  title: "Opportunities browse directions · Missa design review",
  robots: { index: false, follow: false },
};

export default function OpportunitiesBrowseHubPage() {
  return <OpportunitiesBrowseHub />;
}
