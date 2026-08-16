import type { Metadata } from "next";
import type { PublicUserProfile } from "@missa/radar-engine";

import { PublicProfileView } from "@/components/public-profile-view";
import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Public Profile · Missa design review",
  description:
    "The production public Profile component with a complete fixture.",
  robots: { index: false, follow: false },
};

const profile: PublicUserProfile = {
  id: "profile-amaka",
  displayName: "Amaka Obi",
  profileImageUrl: "/media/home/artist-at-work.webp",
  headline: "Essayist · Screenwriter · Lagos",
  oneLine: "Writing essays and scripts about ordinary life.",
  bio: "Amaka Obi writes essays, fiction, and screenplays about family, work, and the quiet decisions that shape ordinary life.",
  openTo:
    "Commissions, residencies, essay assignments, and thoughtful collaborations.",
  contactEnabled: true,
  selectedWorks: [
    {
      id: "harmattan-year",
      title: "The Harmattan Year",
      publication: "Granta",
      year: 2026,
      url: "https://example.com/the-harmattan-year",
      description:
        "An essay about dust, inheritance, and a grandmother who took the weather personally.",
    },
    {
      id: "borrowed-house",
      title: "Notes on a Borrowed House",
      publication: "Chimurenga",
      year: 2025,
      url: "https://example.com/borrowed-house",
    },
    {
      id: "second-person",
      title: "Second Person, Plural",
      publication: "Saraba · print issue 24",
      year: 2023,
    },
  ],
  socialLinks: [
    { id: "website", service: "website", url: "https://example.com/amaka" },
    {
      id: "instagram",
      service: "instagram",
      url: "https://instagram.com/amaka",
    },
    {
      id: "linkedin",
      service: "linkedin",
      url: "https://linkedin.com/in/amaka",
    },
  ],
  publishedAt: "2026-08-15T00:00:00.000Z",
};

export default function PublicProfileReviewPage() {
  return (
    <PublicSiteShell current="profile">
      <PublicProfileView
        profile={profile}
        handle="amaka"
        shareUrl="https://www.usemissa.com/@amaka"
      />
    </PublicSiteShell>
  );
}
