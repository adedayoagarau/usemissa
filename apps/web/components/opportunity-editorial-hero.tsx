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
      </div>
    </section>
  );
}
