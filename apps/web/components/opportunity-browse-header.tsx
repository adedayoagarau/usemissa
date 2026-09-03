import type { ReactNode } from "react";
import styles from "./opportunity-browse-header.module.css";

export function OpportunityBrowseHeader({ practices, feeds, search, activeFilters, toolbar }: { practices: ReactNode; feeds: ReactNode; search: ReactNode; activeFilters?: ReactNode; toolbar: ReactNode }) {
  return <div className={styles.header}>
    <div className={styles.discovery}>{practices}{feeds}</div>
    <div className={styles.search}>{search}</div>
    {activeFilters}
    {toolbar}
  </div>;
}
