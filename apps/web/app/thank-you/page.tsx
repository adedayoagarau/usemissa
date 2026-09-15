import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";

import { PublicSiteShell } from "@/components/public-site-shell";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";
import { contactMailto } from "@/lib/legalContact";

export const metadata: Metadata = pageMetadata({
  title: "Thank you",
  description:
    "Your place on the Missa waitlist is saved. Here is what happens next.",
  path: "/thank-you",
  noIndex: true,
});

const WAITLIST_CONFIRMATION =
  "You’re on the list. We’ll let you know when Missa is ready for you.";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const joinedWaitlist = source === "waitlist";

  return (
    <PublicSiteShell current="">
      <main
        id="main-content"
        className="mx-auto w-[min(100%-40px,720px)] py-20 sm:py-28"
      >
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {joinedWaitlist ? "Waitlist" : "Confirmation"}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-medium tracking-tight sm:text-6xl">
          {joinedWaitlist ? "Your place is saved." : "Thank you."}
        </h1>

        {joinedWaitlist ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-foreground"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
            >
              <Check size={14} strokeWidth={2.5} />
            </span>
            <span>{WAITLIST_CONFIRMATION}</span>
          </p>
        ) : (
          <p className="mt-6 max-w-prose text-base leading-7 text-muted-foreground">
            We received what you sent. Nothing else is required from you right
            now.
          </p>
        )}

        <p className="mt-6 max-w-prose text-base leading-7 text-muted-foreground">
          You can keep exploring while you wait. Every Opportunity on Missa
          keeps a link to its official source, so you always confirm details
          where they actually control the outcome.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href="/opportunities" />}>
            Browse opportunities
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/methodology" />}
          >
            How Missa works
          </Button>
        </div>

        <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail aria-hidden="true" size={16} />
          Need to change your details?{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href={contactMailto()}
          >
            Email us
          </a>
        </p>
      </main>
    </PublicSiteShell>
  );
}
