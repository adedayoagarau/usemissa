import Link from "next/link";

export default function JournalNotFound() {
  return (
    <main
      className="mx-auto min-h-screen max-w-3xl px-4 py-16 sm:px-6"
      aria-labelledby="journal-not-found-heading"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
        Missa directory
      </p>
      <h1
        id="journal-not-found-heading"
        className="mt-3 text-3xl font-semibold tracking-tight"
      >
        Journal or press not found
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        This profile is not available in the published directory.
      </p>
      <Link
        href="/journals"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border px-5 font-medium text-foreground hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Back to journals and small presses
      </Link>
    </main>
  );
}
