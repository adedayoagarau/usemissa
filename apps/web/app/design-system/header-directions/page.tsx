import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Menu, Search } from "lucide-react";
import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./header-directions.module.css";

export const metadata: Metadata = {
  title: "Public masthead directions · Missa design review",
  robots: { index: false, follow: false },
};

const links = [
  "Opportunities",
  "Directory",
  "Residencies",
  "For organizations",
];

function CreateAccount({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? styles.compactCreate : styles.create}>
      Create account <ArrowUpRight aria-hidden="true" />
    </span>
  );
}

export default function HeaderDirectionsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p>Missa design review</p>
          <h1 className="font-heading">Public masthead directions</h1>
        </div>
        <Link href="/opportunities?preview=public">
          Return to Opportunities
        </Link>
      </header>

      <section className={styles.direction} aria-labelledby="direction-one">
        <div className={styles.note}>
          <span>01</span>
          <div>
            <h2 id="direction-one">Editorial rule</h2>
            <p>Quiet, architectural, and closest to the current system.</p>
          </div>
        </div>
        <div className={`${styles.frame} ${styles.editorial}`}>
          <MissaWordmark size="app" />
          <nav aria-label="Editorial rule preview">
            {links.map((link, index) => (
              <span key={link} data-active={index === 0 || undefined}>
                {link}
              </span>
            ))}
          </nav>
          <div className={styles.actions}>
            <span>Log in</span>
            <CreateAccount />
          </div>
        </div>
      </section>

      <section className={styles.direction} aria-labelledby="direction-two">
        <div className={styles.note}>
          <span>02</span>
          <div>
            <h2 id="direction-two">Gallery index</h2>
            <p>More cultural and ownable, with numbered destinations.</p>
          </div>
        </div>
        <div className={`${styles.frame} ${styles.gallery}`}>
          <div className={styles.galleryTop}>
            <MissaWordmark size="app" />
            <div className={styles.actions}>
              <Search aria-hidden="true" />
              <span>Log in</span>
              <CreateAccount compact />
            </div>
          </div>
          <nav aria-label="Gallery index preview">
            {links.map((link, index) => (
              <span key={link} data-active={index === 0 || undefined}>
                <small>0{index + 1}</small>
                {link}
              </span>
            ))}
          </nav>
        </div>
      </section>

      <section className={styles.direction} aria-labelledby="direction-three">
        <div className={styles.note}>
          <span>03</span>
          <div>
            <h2 id="direction-three">Studio frame</h2>
            <p>A warmer floating object with stronger product presence.</p>
          </div>
        </div>
        <div className={`${styles.frame} ${styles.studio}`}>
          <MissaWordmark size="app" />
          <nav aria-label="Studio frame preview">
            {links.map((link, index) => (
              <span key={link} data-active={index === 0 || undefined}>
                {link}
              </span>
            ))}
          </nav>
          <div className={styles.actions}>
            <span>Log in</span>
            <CreateAccount />
          </div>
          <Menu className={styles.menu} aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
