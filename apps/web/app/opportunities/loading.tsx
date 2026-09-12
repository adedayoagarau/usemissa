import { OpportunityShell } from "@/components/opportunity-shell";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./opportunities.module.css";

export default function OpportunitiesLoading() {
  return (
    <OpportunityShell session={null}>
      <main
        className={styles.loading}
        aria-busy="true"
        aria-labelledby="opportunities-loading-heading"
      >
        <p className={styles.loadingEyebrow}>Opportunities</p>
        <h1 id="opportunities-loading-heading">Finding open calls…</h1>
        <p className={styles.loadingStatus} role="status" aria-live="polite">
          Loading the opportunity catalogue.
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
