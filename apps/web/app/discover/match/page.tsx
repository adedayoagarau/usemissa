import type { Metadata } from "next";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ManuscriptMatchWizard } from "@/components/discover/manuscript-match-wizard";
import { getManuscriptMatchEngine } from "@/lib/manuscriptMatchEngine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manuscript Strategy & Submission Matcher",
  description:
    "Match your short story, essay, or poetry packet against the Missa magazine index with taste DNA comps, debut friendliness ratings, and payout verification.",
};

export default async function ManuscriptMatchPage() {
  const engine = getManuscriptMatchEngine();
  const initialData = await engine.matchManuscript({
    genre: "fiction",
    wordCount: 3500,
    aestheticTags: ["fabulist", "lyric"],
    compAuthors: ["Carmen Maria Machado"],
    isDebutAuthor: true,
    allowSimultaneous: true,
  });

  return (
    <PublicSiteShell current="Discover">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Submission Intelligence
          </span>
          <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Where Should I Submit My Piece?
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:max-w-2xl">
            Find the right literary magazines for your manuscript. Calculate fit scores across the Missa magazine index based on word count limits, author comps, debut acceptance ratios, and payment rates.
          </p>
        </header>

        <ManuscriptMatchWizard initialData={initialData} />
      </main>
    </PublicSiteShell>
  );
}
