import type { ReactNode } from "react";
import styles from "./opportunity-browse-header.module.css";

export function OpportunityBrowseHeader({ search, activeFilters, toolbar }: { search: ReactNode; activeFilters?: ReactNode; toolbar: ReactNode }) {
  return <div className={styles.header}>
    <div className={styles.search}>{search}</div>
    {activeFilters}
    {toolbar}
  </div>;
}
