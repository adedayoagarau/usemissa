import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { Button } from "@/components/ui/button";
import { LEGAL_CONTACT_EMAIL, contactMailto } from "@/lib/legalContact";

export const metadata: Metadata = {
  title: "Claim a magazine profile · Missa",
  description:
    "Editors can ask Missa to correct or confirm a literary magazine profile by email.",
  robots: { index: false, follow: true },
};

export default async function ClaimRankingPage({
  searchParams,
}: {
  searchParams?: Promise<{ profileId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const profileId = params.profileId?.trim().slice(0, 200);
  const subject = profileId
    ? `Magazine profile claim: ${profileId}`
    : "Magazine profile claim";

  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-3xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Magazine Rankings
          </Link>
        </div>

        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Claim a magazine profile
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Claims are handled by email for now. Write to{" "}
            <a
              href={contactMailto(subject)}
              className="font-medium text-primary underline underline-offset-4"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            from an address at your magazine&apos;s domain.
          </p>
        </header>

        <section aria-labelledby="claim-include" className="mt-8 max-w-2xl">
          <h2 id="claim-include" className="text-lg font-semibold text-foreground">
            Include
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>The magazine name and a link to its Missa profile.</li>
            <li>Your name and role on the masthead.</li>
            <li>
              Any details to correct, such as contributor pay, fees, fee
              waivers, or response times, with a link to the official page.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Nothing on the profile changes until Missa has checked the claim.
          </p>
          <Button
            className="mt-6"
            nativeButton={false}
            render={<a href={contactMailto(subject)} />}
          >
            Email Missa
          </Button>
        </section>
      </main>
    </PublicSiteShell>
  );
}
