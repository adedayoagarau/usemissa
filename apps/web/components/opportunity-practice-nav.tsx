import Link from "next/link";
import {
  BookOpenText,
  Clapperboard,
  Drama,
  LayoutGrid,
  Music2,
  Palette,
  PenTool,
  Shapes,
} from "lucide-react";
import styles from "./opportunity-practice-nav.module.css";

type Practice = { value: string; label: string; count: number };

const featuredPractices = [
  { label: "Writing & literature", shortLabel: "Writing", icon: PenTool },
  { label: "Visual arts", shortLabel: "Visual arts", icon: Palette },
  { label: "Performance & live art", shortLabel: "Performance", icon: Drama },
  { label: "Film & moving image", shortLabel: "Film", icon: Clapperboard },
  { label: "Music & sound", shortLabel: "Music", icon: Music2 },
  { label: "Design", shortLabel: "Design", icon: Shapes },
  {
    label: "Interdisciplinary, hybrid & emerging practice",
    shortLabel: "Interdisciplinary",
    icon: BookOpenText,
  },
] as const;

function hrefFor(query: string, taxonomy?: string): string {
  const params = new URLSearchParams(query);
  params.delete("cursor");
  params.delete("taxonomy");
  params.delete("taxonomyDescendants");
  params.delete("taxonomyVersion");
  if (taxonomy) {
    params.set("taxonomy", taxonomy);
    params.set("taxonomyDescendants", "1");
  }
  const next = params.toString();
  return next ? `/opportunities?${next}` : "/opportunities";
}

export function OpportunityPracticeNav({
  practices,
  currentQuery,
  selectedTaxonomy,
}: {
  practices: Practice[];
  currentQuery: string;
  selectedTaxonomy: string[];
}) {
  const items = featuredPractices.flatMap((item) => {
    const practice = practices.find((candidate) => candidate.label === item.label);
    return practice ? [{ ...item, ...practice }] : [];
  });
  const allSelected = selectedTaxonomy.length === 0;

  return (
    <nav className={styles.nav} aria-label="Creative practice">
      <div className={styles.scroller}>
        <Link
          href={hrefFor(currentQuery)}
          className={allSelected ? styles.active : undefined}
          aria-current={allSelected ? "page" : undefined}
        >
          <LayoutGrid aria-hidden="true" />
          <span>All fields</span>
        </Link>
        {items.map(({ value, shortLabel, icon: Icon }) => {
          const active = selectedTaxonomy.includes(value);
          return (
            <Link
              key={value}
              href={hrefFor(currentQuery, value)}
              className={active ? styles.active : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
