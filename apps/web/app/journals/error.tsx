"use client";

export default function JournalsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="mx-auto min-h-screen max-w-3xl px-4 py-16 sm:px-6"
      aria-labelledby="journals-error-heading"
    >
      <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
        Missa directory
      </p>
      <h1
        id="journals-error-heading"
        className="mt-3 text-3xl font-semibold tracking-tight"
      >
        We couldn’t load this profile directory
      </h1>
      <p
        className="mt-4 leading-7 text-muted-foreground"
        role="alert"
        aria-live="assertive"
      >
        The published journals and small presses are temporarily unavailable.
        Try again, or return to the directory later.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Try again
      </button>
    </main>
  );
}
