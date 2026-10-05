"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./globals.css";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Replaces the root layout when it fails, so it renders its own document.
 * It avoids shell components that read cookies or the database.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground">
        <main className="mx-auto flex min-h-screen w-[min(100%-40px,720px)] flex-col justify-center py-20">
          <Empty role="alert">
            <EmptyHeader>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Missa
              </p>
              <EmptyTitle>
                Missa could not load.
              </EmptyTitle>
              <EmptyDescription>
                The problem is on our side. Try again, or come back in a few minutes.
              </EmptyDescription>
            </EmptyHeader>
            <div className="flex flex-wrap gap-3">
              <Button onClick={reset}>Try again</Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
                Go to the home page
              </Button>
            </div>
            {error.digest ? (
              <p className="font-mono text-xs text-muted-foreground">
                Reference {error.digest}
              </p>
            ) : null}
          </Empty>
        </main>
      </body>
    </html>
  );
}
