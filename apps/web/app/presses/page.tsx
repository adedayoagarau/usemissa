import type { Metadata } from "next";
import { listingMetadata } from "@/lib/seo";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  return listingMetadata(
    {
      title: "Small and independent presses: what they publish and how to submit",
      description:
        "Small and independent presses, what they publish, whether they read unsolicited manuscripts, and a link to each press's guidelines.",
      path: "/presses",
    },
    searchParams,
  );
}
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="small_press"
      basePath="/presses"
      title="Find your next publisher."
      description="Explore independent presses and the writing they publish."
      searchParams={searchParams}
    />
  );
}
