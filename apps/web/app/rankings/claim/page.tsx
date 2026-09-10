import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";
import { PublisherClaimForm } from "@/components/rankings/publisher-claim-form";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim & Verify Your Publication · Missa Index",
  description:
    "Editorial verification portal for literary magazine mastheads. Verify contributor payment, fee waivers, turnaround policies, and national prize citations.",
};

export default async function ClaimRankingPage({
  searchParams,
}: {
  searchParams?: Promise<{ profileId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const repository = getMagazineRankingRepository();
  const page = await repository.listRankings({
    genre: "overall",
    year: 2026,
    limit: 1000,
  });

  const initialMagazines = page.items.map((item) => ({
    profileId: item.profileId,
    name: item.name,
    slug: item.slug,
  }));

  return (
    <PublicSiteShell current="Directory">
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-3xl min-w-0 px-4 py-12 sm:px-6 sm:py-16"
      >
        {/* Navigation Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/rankings/magazines"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Magazine Rankings
          </Link>
        </div>

        {/* Page Header */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            Editorial Verification Portal
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Claim & Verify Your Literary Magazine
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Are you an editor, managing editor, or publisher of a literary
            journal? Verify your publication&apos;s standing, confirm
            contributor payment rates, submit fee waiver schedules, and ensure
            your magazine&apos;s profile accurately reflects your editorial
            stewardship.
          </p>
        </header>

        {/* Claim Form */}
        <PublisherClaimForm
          initialMagazines={initialMagazines}
          preselectedProfileId={params.profileId}
        />
      </main>
    </PublicSiteShell>
  );
}
