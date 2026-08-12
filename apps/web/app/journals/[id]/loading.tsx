export default function JournalDetailLoading() {
  return (
    <main
      className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6 sm:py-16"
      aria-busy="true"
      aria-labelledby="journal-loading-heading"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
        Missa directory
      </p>
      <h1
        id="journal-loading-heading"
        className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Loading profile…
      </h1>
      <p
        className="mt-4 text-lg leading-7 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading the published profile and related opportunities.
      </p>
      <div
        className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
        aria-hidden="true"
      >
        <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    </main>
  );
}
