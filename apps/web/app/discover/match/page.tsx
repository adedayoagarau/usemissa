import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PublicSiteShell } from "@/components/public-site-shell";
import { ManuscriptMatchWizard } from "@/components/discover/manuscript-match-wizard";
import {
  DEFAULT_MANUSCRIPT_BRIEF,
  manuscriptMatchPayload,
} from "@/components/discover/manuscript-match-brief";
import styles from "@/components/discover/manuscript-match-wizard.module.css";
import { getManuscriptMatchEngine } from "@/lib/manuscriptMatchEngine";

/** Served from the CDN and regenerated at most every five minutes. */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Manuscript Strategy & Submission Matcher | Missa",
  description:
    "Match your short story, essay, or poetry packet against the Missa magazine index with taste DNA comps, debut friendliness ratings, and payment details.",
  path: "/discover/match",
});

export default async function ManuscriptMatchPage() {
  const engine = getManuscriptMatchEngine();
  // The first results use the same brief the form starts with.
  const initialData = await engine.matchManuscript(
    manuscriptMatchPayload(DEFAULT_MANUSCRIPT_BRIEF),
  );

  return (
    <PublicSiteShell current="Discover">
      <main className={styles.page} data-density="spacious">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Manuscript matcher</p>
          <h1 className={`${styles.title} font-heading`}>
            Where should this piece go?
          </h1>
          <p className={styles.lede}>
            Describe your story, essay, or poems. Missa compares it with the
            guidelines, pay, and reply times recorded for each magazine.
          </p>
        </header>

        <ManuscriptMatchWizard initialData={initialData} />
      </main>
    </PublicSiteShell>
  );
}
