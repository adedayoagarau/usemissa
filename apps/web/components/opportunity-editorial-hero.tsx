import Link from "next/link";
import { ArrowRight, Clock3, Coins, Sparkles } from "lucide-react";
import styles from "./opportunity-editorial-hero.module.css";

interface OpportunityEditorialHeroProps {
  counts: { closing: number; free: number; opening: number };
}

export function OpportunityEditorialHero({ counts }: OpportunityEditorialHeroProps) {
  const lanes = [
    { label: "Closing soon", description: "Make the deadline", count: counts.closing, href: "/opportunities?deadlineWithinDays=14", icon: Clock3 },
    { label: "Free to submit", description: "No application fee", count: counts.free, href: "/opportunities?fee=no-fee", icon: Coins },
    { label: "Recently added", description: "Freshly confirmed calls", count: counts.opening, href: "/opportunities?sort=recently-added", icon: Sparkles },
  ] as const;

  return <section className={styles.section} aria-labelledby="opportunities-title">
    <div className={styles.art} aria-hidden="true" />
    <div className={styles.heroCopy}>
      <p className={styles.sectionLabel}>Opportunities</p>
      <h1 id="opportunities-title">Find the work worth making next.</h1>
      <p className={styles.intro}>Explore confirmed calls across writing, visual arts, performance, film, music, design, and interdisciplinary practice.</p>
      <p className={styles.publicNote}>Browse freely. Create an account only when you want to save or track.</p>
    </div>
    <nav className={styles.lanes} aria-label="Curated opportunity collections">
      {lanes.map(({ label, description, count, href, icon: Icon }) => <Link key={label} href={href}>
        <Icon aria-hidden="true" />
        <span><strong>{label}</strong><small>{description} · {count}</small></span>
        <ArrowRight aria-hidden="true" />
      </Link>)}
    </nav>
  </section>;
}
