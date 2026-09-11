"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CreatorPortfolioStudio } from "@/components/creator-portfolio-studio";
import { Button } from "@/components/ui/button";
import styles from "./homepage-portfolio.module.css";

const THEMES = [
  { id: "white", label: "White" },
  { id: "sage", label: "Sage" },
  { id: "paper", label: "Paper" },
  { id: "mineral", label: "Mineral" },
  { id: "night", label: "Night" },
] as const;
type Theme = (typeof THEMES)[number]["id"];

export function HomepagePortfolio() {
  const [theme, setTheme] = useState<Theme>("white");
  return (
    <section
      className={styles.section}
      id="homepage-portfolio"
      aria-labelledby="portfolio-heading"
    >
      <header className={styles.heading}>
        <h2 id="portfolio-heading" className="font-heading">
          Share your work in one portfolio.
        </h2>
        <Button
          nativeButton={false}
          render={<Link href="/profile/portfolio" />}
        >
          Build your portfolio <ArrowUpRight size={18} aria-hidden="true" />
        </Button>
      </header>
      <div className={styles.gallery}>
        <div
          className={styles.themes}
          role="group"
          aria-label="Portfolio theme"
        >
          {THEMES.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className={styles.portfolio}>
          <CreatorPortfolioStudio
            key={theme}
            embedded
            sampleTheme={theme}
            presentation="showcase"
          />
        </div>
      </div>
    </section>
  );
}
