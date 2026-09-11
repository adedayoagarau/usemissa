import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
export const metadata = {
  title: "Portfolio settings design review",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <p className="bg-background px-6 py-3 text-sm text-muted-foreground">
        Settings design preview · sample account · no account data is accessed
      </p>
      <CreatorPortfolioStudio ownerId="design-preview-only" />
    </>
  );
}
