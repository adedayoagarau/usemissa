"use client";
import { Button } from "@/components/ui/button";

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
      <Button size="sm"
        type="button"
        onClick={reset} className="mt-6 inline-flex"
      >
        Try again
      </Button>
    </main>
  );
}
