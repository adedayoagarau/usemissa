import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "./ui/card";
import styles from "./public-creator-profile.module.css";

export type PublicCreatorData = {
  displayName?: string;
  bio?: string;
  isPrivate?: true;
  handle?: string;
  practice?: string;
  works?: {
    id: string;
    title: string;
    kind: string;
    excerpt: string;
    year?: string;
  }[];
  credits?: { title: string; venue: string; year: string }[];
};
/** Accept only an explicitly public projection, never an account or Tracker record. */
export function PublicCreatorProfile({
  profile,
}: {
  profile: PublicCreatorData;
}) {
  if (profile.isPrivate)
    return (
      <main id="main-content" className={styles.main}>
        <header className={styles.identity}>
          <p className={styles.kicker}>Creator profile</p>
          <h1>This profile is private.</h1>
          <p>The creator hasn’t shared a public profile.</p>
          <Link href="/opportunities">
            Explore opportunities <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>
      </main>
    );
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.identity}>
        <div className={styles.meta}>
          <span>{profile.practice || "Creator profile"}</span>
          {profile.handle && <span>@{profile.handle.replace(/^@/, "")}</span>}
        </div>
        <h1>{profile.displayName || "Creator"}</h1>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        {profile.works?.length || profile.credits?.length ? (
          <nav aria-label="Portfolio sections" className={styles.nav}>
            {Boolean(profile.works?.length) && (
              <a href="#selected-work">Selected work</a>
            )}
            {Boolean(profile.credits?.length) && (
              <a href="#selected-credits">Selected credits</a>
            )}
          </nav>
        ) : null}
      </header>
      {Boolean(profile.works?.length) && (
        <section id="selected-work" className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>Selected work</h2>
            <span>{String(profile.works!.length).padStart(2, "0")}</span>
          </div>
          <div className={styles.works}>
            {profile.works!.map((work, i) => (
              <Card key={work.id} className={styles.work}>
                <div className={styles.workMeta}>
                  <span>{work.kind}</span>
                  <span>{work.year}</span>
                </div>
                <span className={styles.number} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{work.title}</h3>
                <p>{work.excerpt}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
      {Boolean(profile.credits?.length) && (
        <section id="selected-credits" className={styles.section}>
          <h2>Selected credits</h2>
          <ul className={styles.credits}>
            {profile.credits!.map((credit, i) => (
              <li key={i}>
                <span>{credit.year}</span>
                <h3>{credit.title}</h3>
                <span>{credit.venue}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!profile.works?.length && !profile.credits?.length && (
        <section className={styles.empty}>
          <h2>Work will appear here.</h2>
          <p>This creator hasn’t shared portfolio work yet.</p>
        </section>
      )}
      <footer className={styles.footer}>
        <span>A creative practice, in progress.</span>
        <Link href="/opportunities">
          Explore opportunities <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
