import { PublicCreatorProfile } from "@/components/public-creator-profile";
import { PublicSiteShell } from "@/components/public-site-shell";
export const metadata = {
  title: "Creator portfolio review",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PublicSiteShell>
      <p className="mx-auto max-w-6xl p-4 text-sm text-muted-foreground">
        Design preview · fictional creator and work · publishing is not
        connected
      </p>
      <PublicCreatorProfile
        profile={{
          displayName: "Alex Morgan",
          handle: "alex-morgan",
          practice: "Poetry & visual storytelling",
          bio: "I work with words, photographs and the places between them. My practice follows the small details of everyday life: what we keep, what we leave, and how a place remembers us.",
          works: [
            {
              id: "one",
              kind: "Poetry · excerpt",
              title: "A room for the morning",
              year: "2026",
              excerpt:
                "We left the window open.\nBy morning, the room had learned\na little of the weather.",
            },
            {
              id: "two",
              kind: "Essay · excerpt",
              title: "The things a city keeps",
              year: "2025",
              excerpt:
                "Every walk begins with something familiar. A doorway, a corner, the tree that holds its leaves a week longer than the others.",
            },
          ],
          credits: [
            {
              year: "2026",
              title: "A room for the morning",
              venue: "Sample journal",
            },
            {
              year: "2025",
              title: "The things a city keeps",
              venue: "Sample anthology",
            },
          ],
        }}
      />
    </PublicSiteShell>
  );
}
