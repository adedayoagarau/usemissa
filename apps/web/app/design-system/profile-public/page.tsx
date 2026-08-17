import type { Metadata } from "next";
import type {
  ProfileWorkSample,
  PublicUserProfile,
} from "@missa/radar-engine";

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
      sample: {
        kind: "text",
        excerpt:
          "The dust came early that year, three weeks before anyone thought to hang the plastic sheeting, and my grandmother announced it the way she announced everything—as though the weather had been consulted beforehand and had disappointed her personally.\n\nWe swept twice a day. By evening, a red line had gathered beneath every door, patient as a second threshold.",
        rightsConfirmedAt: "2026-08-15T00:00:00.000Z",
      },
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

const sampleFixtures: Record<string, ProfileWorkSample | undefined> = {
  text: profile.selectedWorks?.[0]?.sample,
  image: {
    kind: "image",
    publicAssetUrl: "/media/home/portfolio-still-life.webp",
    accessibilityText:
      "A still life arranged on a worktable in soft window light.",
    rightsConfirmedAt: "2026-08-15T00:00:00.000Z",
  },
  audio: {
    kind: "audio",
    publicAssetUrl: "/media/missa-bosphorus.mp4",
    contentType: "audio/mp4",
    transcript: "Instrumental recording.",
    rightsConfirmedAt: "2026-08-15T00:00:00.000Z",
  },
  video: {
    kind: "video",
    publicAssetUrl: "/media/missa-bosphorus.mp4",
    contentType: "video/mp4",
    accessibilityText:
      "A quiet view across the Bosphorus with boats moving through the frame.",
    transcript: "Ambient water and city sound. No speech.",
    rightsConfirmedAt: "2026-08-15T00:00:00.000Z",
  },
  none: undefined,
};

export default async function PublicProfileReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ sample?: string }>;
}) {
  const variant = (await searchParams)?.sample ?? "text";
  const selectedSample = Object.prototype.hasOwnProperty.call(
    sampleFixtures,
    variant,
  )
    ? sampleFixtures[variant]
    : sampleFixtures.text;
  const fixture: PublicUserProfile = {
    ...profile,
    selectedWorks: (profile.selectedWorks ?? []).map((work, index) =>
      index === 0
        ? {
            ...work,
            ...(selectedSample ? { sample: selectedSample } : { sample: undefined }),
          }
        : work,
    ),
  };
  return (
    <PublicSiteShell current="profile">
      <PublicProfileView
        profile={fixture}
        handle="amaka"
        shareUrl="https://www.usemissa.com/@amaka"
      />
    </PublicSiteShell>
  );
}
