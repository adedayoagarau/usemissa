import type { Metadata } from "next";

import { OpportunitiesBrowseForestPreview } from "@/components/design-system/opportunities-browse-forest-preview";

export const metadata: Metadata = {
  title: "Opportunities browse · Forest band · Missa design review",
  robots: { index: false, follow: false },
};

export default function OpportunitiesBrowseForestPage() {
  return <OpportunitiesBrowseForestPreview />;
}
