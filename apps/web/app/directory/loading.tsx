import { PublicSiteShell } from "@/components/public-site-shell";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural loading state for the organization directory. */
export default function DirectoryLoading() {
  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto w-[min(100%-40px,1240px)] py-16"
        aria-busy="true"
        aria-labelledby="directory-loading-heading"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Directory
        </p>
        <h1
          id="directory-loading-heading"
          className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl"
        >
          Loading the directory…
        </h1>
        <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          Finding organizations and publications.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-40 rounded-xl" />
          ))}
        </div>
      </main>
    </PublicSiteShell>
  );
}
