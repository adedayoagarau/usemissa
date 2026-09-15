import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";
import { Button } from "@/components/ui/button";
import { contactMailto } from "@/lib/legalContact";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This Missa page does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PublicSiteShell current="">
      <main
        id="main-content"
        className="mx-auto flex min-h-[60vh] w-[min(100%-40px,720px)] flex-col justify-center py-20 text-foreground"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
          This page isn&apos;t here.
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-muted-foreground">
          The link may be out of date, or the page may have moved. The source
          of every Opportunity on Missa stays with the Opportunity itself, so
          nothing here changes where you apply.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href="/opportunities" />}>
            Browse opportunities
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/directory" />}
          >
            Open the directory
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Still stuck?{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href={contactMailto()}
          >
            Tell us which link you followed
          </a>
          .
        </p>
      </main>
    </PublicSiteShell>
  );
}
