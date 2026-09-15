import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading magazine rankings"
      className="mx-auto max-w-7xl space-y-6 px-6 py-12"
    >
      <p role="status">Loading magazine rankings…</p>
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="h-11 w-full" />
      {[0, 1, 2].map((row) => (
        <Skeleton
          key={row}
          className="h-24 w-full"
        />
      ))}
    </main>
  );
}
