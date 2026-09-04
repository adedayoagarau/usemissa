import type { Metadata } from "next";
import { OpportunitiesBrowseV2Preview } from "@/components/design-system/opportunities-browse-v2-preview";

export const metadata: Metadata = {
  title: "Opportunities browse v2 · Missa design review",
  robots: { index: false, follow: false },
};

export default function OpportunitiesBrowseV2Page() {
  return <OpportunitiesBrowseV2Preview />;
}
