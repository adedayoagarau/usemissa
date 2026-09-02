import type { ReactNode } from "react";
import { Info } from "lucide-react";
import styles from "./opportunity-browse-header.module.css";

export function OpportunityBrowseHeader({ practices, feeds, search, activeFilters, toolbar }: { practices: ReactNode; feeds: ReactNode; search: ReactNode; activeFilters?: ReactNode; toolbar: ReactNode }) {
  return <header className={styles.header} aria-labelledby="opportunities-title">
    <div className={styles.intro}>
      <div><h1 id="opportunities-title">Opportunities</h1><p>Explore confirmed calls across writing, visual arts, performance, film, music, design, and interdisciplinary practice.</p></div>
      <p className={styles.note}><Info aria-hidden="true" />Browsing is public. Save and track with a free account.</p>
    </div>
    <div className={styles.discovery}>{practices}{feeds}</div>
    <div className={styles.search}>{search}</div>
    {activeFilters}
    {toolbar}
  </header>;
}
