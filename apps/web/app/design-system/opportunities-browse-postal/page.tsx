import type { Metadata } from "next";

import { OpportunitiesBrowsePostalPreview } from "@/components/design-system/opportunities-browse-postal-preview";

export const metadata: Metadata = {
  title: "Opportunities browse · Postal types · Missa design review",
  robots: { index: false, follow: false },
};

export default function OpportunitiesBrowsePostalPage() {
  return <OpportunitiesBrowsePostalPreview />;
}
