import { MissaSiteHeader } from "@/components/missa-site-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural loading state while a single Opportunity is read. */
export default function OpportunityDetailLoading() {
  return (
    <div className="min-h-screen bg-card">
      <MissaSiteHeader session={null} />
      <main
        id="main-content"
        className="mx-auto w-[min(100%-40px,1120px)] py-12"
        aria-busy="true"
        aria-labelledby="opportunity-loading-heading"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Opportunity
        </p>
        <h1
          id="opportunity-loading-heading"
          className="mt-3 font-heading text-3xl font-medium tracking-tight sm:text-5xl"
        >
          Loading this Opportunity…
        </h1>
        <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          Reading the details and their official source.
        </p>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden="true">
          <div className="space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-6 h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
