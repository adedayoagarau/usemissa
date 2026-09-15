import { PublicSiteShell } from "@/components/public-site-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural loading state for the country browse surface. */
export default function CountriesLoading() {
  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto w-[min(100%-40px,1240px)] py-16"
        aria-busy="true"
        aria-labelledby="countries-loading-heading"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Countries
        </p>
        <h1
          id="countries-loading-heading"
          className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl"
        >
          Loading countries…
        </h1>
        <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          Counting open calls by country.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <Skeleton key={item} className="h-28 rounded-xl" />
          ))}
        </div>
      </main>
    </PublicSiteShell>
  );
}
