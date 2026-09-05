import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import { PublicSiteShell } from "@/components/public-site-shell";
export const metadata = {
  title: "Creator portfolio review",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PublicSiteShell>
      <CreatorPortfolioStudio />
    </PublicSiteShell>
  );
}
