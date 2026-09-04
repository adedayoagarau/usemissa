import Link from "next/link";
import styles from "./opportunity-editorial-hero.module.css";

export function OpportunityEditorialHero() {
  return (
    <section className={styles.section} aria-labelledby="opportunities-title">
      <div className={styles.art} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <h1 id="opportunities-title" className="font-heading">
          Find calls for submissions, residencies, grants.
        </h1>
        <p className={styles.intro}>
          Explore opportunities across writing, visual arts, performance, film,
          music, design and interdisciplinary practice.
        </p>
        <nav className={styles.curatedTags} aria-label="Curated collections">
          <Link href="/discover/queer-lgbtq-opportunities" className={styles.curatedChip}>
            Queer & LGBTQ+
          </Link>
          <Link href="/discover/bipoc-opportunities" className={styles.curatedChip}>
            BIPOC Creators
          </Link>
          <Link href="/discover/women-nonbinary-opportunities" className={styles.curatedChip}>
            Women & Non-Binary
          </Link>
          <Link href="/discover/disabled-neurodivergent-opportunities" className={styles.curatedChip}>
            Disabled & Neurodivergent
          </Link>
          <Link href="/discover/emerging-writers-artists" className={styles.curatedChip}>
            Emerging & Debut
          </Link>
          <Link href="/discover/jobs-for-creators" className={styles.curatedChip}>
            Creative Jobs
          </Link>
        </nav>
      </div>
    </section>
  );
}
