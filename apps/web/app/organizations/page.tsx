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
      title: "Visual arts organizations & galleries | Missa",
      description:
        "Browse the visual arts section of Missa’s organization directory, including galleries, nonprofits and arts organizations worldwide.",
      path: "/organizations",
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
      kind="visual_arts_organization"
      basePath="/organizations"
      title="Explore visual arts organizations."
      description="Browse galleries, nonprofits and visual arts organizations in this section of the wider organization directory."
      searchParams={searchParams}
    />
  );
}
