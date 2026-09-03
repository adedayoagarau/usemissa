"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Bookmark, CalendarDays, MapPin, SlidersHorizontal, Tag } from "lucide-react";
import styles from "./typography-proof.module.css";

type System = "proposal" | "current";

export function TypographyProof() {
  const [system, setSystem] = useState<System>("proposal");

  return <main className={styles.page} data-system={system}>
    <header className={styles.proofHeader}>
      <div>
        <p>Typography decision proof</p>
        <h1>One comparison. Three real Missa contexts.</h1>
      </div>
      <div className={styles.switcher} role="group" aria-label="Typography system">
        <button type="button" aria-pressed={system === "proposal"} onClick={() => setSystem("proposal")}>Newsreader + Instrument</button>
        <button type="button" aria-pressed={system === "current"} onClick={() => setSystem("current")}>Current Ysabeau</button>
      </div>
    </header>

    <section className={styles.stage} aria-labelledby="hero-proof-title">
      <p className={styles.stageLabel}>01 · Public discovery</p>
      <div className={styles.hero}>
        <Image className={styles.heroImage} src="/media/typography-proof/opportunities-field.webp" alt="A solitary person standing among wildflowers beneath an expansive blue sky" fill priority sizes="100vw" />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p>Opportunities</p>
          <h2 id="hero-proof-title">Find calls for submissions, residencies, and grants.</h2>
          <span>Explore opportunities across writing, visual arts, performance, film, music, design and interdisciplinary practice.</span>
        </div>
        <form className={styles.searchDock} onSubmit={(event) => event.preventDefault()}>
          <label><span className="sr-only">Search opportunities</span><input type="search" placeholder="Search opportunities" /></label>
          <button type="button">All disciplines <span aria-hidden="true">⌄</span></button>
          <button type="button"><SlidersHorizontal aria-hidden="true" /> Filters <b>2</b></button>
          <button type="submit">Search <ArrowRight aria-hidden="true" /></button>
        </form>
      </div>
    </section>

    <section className={styles.stage} aria-labelledby="card-proof-title">
      <p className={styles.stageLabel}>02 · Dense opportunity result</p>
      <article className={styles.opportunityCard}>
        <div className={styles.identityMark}><strong>NR</strong><span>North River Review</span></div>
        <div className={styles.cardBody}>
          <div className={styles.cardTopline}><span>Magazine</span><b>Closes in 7 days</b></div>
          <h2 id="card-proof-title">North River Review — Call for Submissions</h2>
          <p>North River Review</p>
          <span className={styles.disciplines}>Poetry · Fiction · Creative nonfiction</span>
          <dl>
            <div><dt><CalendarDays aria-hidden="true" /> Deadline</dt><dd>Sep 9, 2026</dd></div>
            <div><dt><Tag aria-hidden="true" /> Entry fee</dt><dd>No fee</dd></div>
            <div><dt><MapPin aria-hidden="true" /> Reach</dt><dd>International</dd></div>
          </dl>
        </div>
        <div className={styles.cardActions}>
          <button type="button"><Bookmark aria-hidden="true" /> Save</button>
          <button type="button">View opportunity <ArrowRight aria-hidden="true" /></button>
        </div>
      </article>
    </section>

    <section className={styles.stage} aria-labelledby="portfolio-proof-title">
      <p className={styles.stageLabel}>03 · Public artist portfolio</p>
      <article className={styles.portfolio}>
        <div className={styles.portrait} aria-hidden="true">AO</div>
        <div className={styles.portfolioCopy}>
          <p>Poet · Essayist · Editor</p>
          <h2 id="portfolio-proof-title">Adedayo Agarau</h2>
          <blockquote>“I make work about memory, migration, and the strange architecture of belonging.”</blockquote>
          <span>San Jose, California · Available for readings and collaborations</span>
        </div>
        <button type="button">View selected work <ArrowRight aria-hidden="true" /></button>
      </article>
    </section>

    <footer className={styles.legend}>
      <p><strong>{system === "proposal" ? "Proposal" : "Current system"}</strong></p>
      <p>{system === "proposal" ? "Newsreader carries identity and invitation. Instrument Sans carries comprehension and action. Fragment Mono carries structured facts." : "Ysabeau carries display, interface, and body. Fragment Mono carries structured facts."}</p>
    </footer>
  </main>;
}
