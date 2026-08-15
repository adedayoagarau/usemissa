import type { Metadata } from "next";

import { ProfilePortfolioDirections } from "@/components/design-system/profile-portfolio-directions";

export const metadata: Metadata = {
  title: "Profile portfolio · Missa design review",
  description:
    "Local review route for the public Profile portfolio composition.",
  robots: { index: false, follow: false },
};

export default function ProfilePortfolioPage() {
  return <ProfilePortfolioDirections />;
}
