"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { contactMailto } from "@/lib/legalContact";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[60vh] w-[min(100%-40px,720px)] flex-col justify-center py-20 text-foreground"
    >
      <Empty role="alert">
        <EmptyHeader>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Missa
          </p>
          <EmptyTitle>
            This page could not load.
          </EmptyTitle>
          <EmptyDescription>
            The problem is on our side. Try again, or come back in a few minutes.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/opportunities" />}
          >
            Browse opportunities
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Still not loading?{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href={contactMailto("Page did not load")}
          >
            Tell us which page
          </a>
          .
          {error.digest ? (
            <span className="block pt-1 font-mono text-xs">
              Reference {error.digest}
            </span>
          ) : null}
        </p>
      </Empty>
    </main>
  );
}
