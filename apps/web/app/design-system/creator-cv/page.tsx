import { CreatorCv } from "@/components/creator-profile/creator-cv";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";

export const metadata = {
  title: "Creator CV review",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <CreatorCv
      portfolio={sampleCreatorPortfolio()}
      handleKey="rileychen"
      backHref="/design-system/creator-profile-v2"
    />
  );
}
