import type { Metadata } from "next";
import { DirectoryCategoryPage } from "@/components/directory-category-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Grant foundations",
  description:
    "Explore grant foundations and organizations supporting artists and writers.",
};
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <DirectoryCategoryPage
      kind="grant_foundation"
      basePath="/grants"
      title="Meet the organizations funding creative work."
      description="Explore grant foundations and organizations supporting artists and writers."
      searchParams={searchParams}
    />
  );
}
