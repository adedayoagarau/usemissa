import { PublicSiteShell } from "@/components/public-site-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural loading state for residency rankings and reviews. */
export default function ResidenciesLoading() {
  return (
    <PublicSiteShell current="Residencies">
      <main
        id="main-content"
        className="mx-auto w-[min(100%-40px,1240px)] py-16"
        aria-busy="true"
        aria-labelledby="residencies-loading-heading"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Residencies
        </p>
        <h1
          id="residencies-loading-heading"
          className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl"
        >
          Loading residency rankings…
        </h1>
        <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          Finding residencies and their reviews.
        </p>
        <div className="mt-10 grid gap-4" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
      </main>
    </PublicSiteShell>
  );
}
