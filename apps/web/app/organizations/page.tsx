import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Visual arts organizations & galleries",
  description:
    "Browse the visual arts section of Missa’s organization directory, including galleries, nonprofits and arts organizations worldwide.",
};
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
