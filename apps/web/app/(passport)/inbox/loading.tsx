import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-8 pb-12"
      aria-busy="true"
      aria-describedby="inbox-loading-status"
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-48" />
      </header>
      <div className="flex gap-6 border-b border-border pb-2">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-32" />
      </div>
      <section className="space-y-6" aria-hidden="true">
        <div className="space-y-3 border-b border-border pb-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </section>
      <p id="inbox-loading-status" role="status" className="sr-only">
        Loading your Inbox.
      </p>
    </div>
  );
}
