export default function JournalsLoading() {
  return (
    <main
      className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      aria-busy="true"
      aria-labelledby="journals-loading-heading"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
        Missa directory
      </p>
      <h1
        id="journals-loading-heading"
        className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        Journals & small presses
      </h1>
      <p
        className="mt-4 text-lg leading-7 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Loading journals and small presses…
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
