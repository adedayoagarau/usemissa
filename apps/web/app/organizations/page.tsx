import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Galleries & arts organizations",
  description:
    "Explore galleries, nonprofits and visual arts organizations worldwide.",
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
      title="Connect with the arts community."
      description="Explore galleries, nonprofits and visual arts organizations worldwide."
      searchParams={searchParams}
    />
  );
}
