import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileEditor } from "@/components/profile-editor";

export const metadata: Metadata = {
  title: "Profile owner mode · Missa design review",
  description: "The production owner Profile editor with a complete fixture.",
  robots: { index: false, follow: false },
};

export default function ProfileOwnerReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProfileEditor
        initialProfile={{
          id: "profile-amaka",
          displayName: "Amaka Obi",
          bio: "Amaka Obi writes essays, fiction, and screenplays about family, work, and the quiet decisions that shape ordinary life.",
          handle: "amaka",
          publicUrl: "/design-system/profile-public",
          published: true,
          publicPortfolio: {
            profileImageUrl: "/media/home/artist-at-work.webp",
            headline: "Essayist · Screenwriter · Lagos",
            oneLine: "Writing essays and scripts about ordinary life.",
            openTo:
              "Commissions, residencies, essay assignments, and thoughtful collaborations.",
            contactEnabled: true,
            selectedWorks: [
              {
                id: "harmattan-year",
                workId: "library-harmattan-year",
                title: "The Harmattan Year",
                publication: "Granta",
                year: 2026,
                url: "https://example.com/the-harmattan-year",
                description:
                  "An essay about dust, inheritance, and a grandmother who took the weather personally.",
                sample: {
                  kind: "text",
                  excerpt:
                    "The dust came early that year, three weeks before anyone thought to hang the plastic sheeting.",
                  rightsConfirmedAt: "2026-08-15T00:00:00.000Z",
                },
              },
              {
                id: "borrowed-house",
                title: "Notes on a Borrowed House",
                publication: "Chimurenga",
                year: 2025,
              },
            ],
            socialLinks: [
              {
                id: "website",
                service: "website",
                url: "https://example.com/amaka",
              },
              {
                id: "instagram",
                service: "instagram",
                url: "https://instagram.com/amaka",
              },
            ],
          },
          libraryWorks: [
            {
              id: "library-harmattan-year",
              title: "The Harmattan Year",
              description:
                "An essay about dust, inheritance, and a grandmother who took the weather personally.",
              sampleKind: "text",
            },
          ],
        }}
        nav={{
          email: "amaka@example.com",
          userId: "profile-amaka",
          isAdmin: false,
          organizations: [],
        }}
      />
    </Suspense>
  );
}
