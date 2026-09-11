export default function JournalsLoading() {
  return (
    <main
      className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-labelledby="journals-loading-heading"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
        Missa directory
      </p>
      <h1
        id="journals-loading-heading"
        className="mt-2 font-sans text-2xl font-medium tracking-tight"
      >
        Find a home for your writing.
      </h1>
      <p
        className="mt-2 text-sm leading-6 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading journals…
      </p>
      <div
        className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>
    </main>
  );
}
