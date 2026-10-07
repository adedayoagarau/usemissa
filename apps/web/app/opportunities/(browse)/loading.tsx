import { OpportunityShell } from "@/components/opportunity-shell";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "../opportunities.module.css";

export default function OpportunitiesLoading() {
  return (
    <OpportunityShell session={null}>
      <main
        className={styles.loading}
        aria-busy="true"
        aria-labelledby="opportunities-loading-heading"
      >
        <p className={styles.loadingEyebrow}>Opportunities</p>
        <p id="opportunities-loading-heading" className={styles.loadingTitle}>Finding open calls…</p>
        <p className={styles.loadingStatus} role="status" aria-live="polite">
          Reading the fine print…
        </p>
        <Skeleton className={styles.loadingSearch} />
        <div className={styles.loadingGrid} aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className={styles.loadingCard} />
          ))}
        </div>
      </main>
    </OpportunityShell>
  );
}
