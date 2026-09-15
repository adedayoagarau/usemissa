import { cookies } from "next/headers";
import type { ReactNode } from "react";
import Link from "next/link";
import { getMagazineRankingRepository } from "@/lib/magazineRankingRepository";
import { getEditorialIntelligenceRepository } from "@/lib/editorialIntelligenceRepository";
import { JournalProfileDetails } from "@/components/journal-profile-details";
import { RankingTierBadge } from "@/components/missa/ranking-indicators";
import { getOpportunityRepository } from "@/lib/opportunityRepository";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { SaveToTrackerButton } from "@/components/save-to-tracker-button";
import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionProfileView } from "@/components/institution-profile-view";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

import {
  type MagazineRankingRow,
  type ProfileOpportunity,
} from "@missa/radar-adapters";

export const dynamic = "force-dynamic";

function uniqueOpportunitiesByCanonicalId(
  items: ProfileOpportunity[],
): ProfileOpportunity[] {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    const canonicalId = item.id.trim();
    if (!canonicalId) return true;
    if (seenIds.has(canonicalId)) return false;
    seenIds.add(canonicalId);
    return true;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) return { title: "Journal Not Found" };
  return {
    alternates: { canonical: `/journal/${encodeURIComponent(profile.slug)}` },
    title: `${profile.name} — Literary Journal Profile`,
    description: profile.summary || `Submission guidelines, reading windows, and acceptance details for ${profile.name}.`,
  };
}

export default async function JournalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) notFound();

  if (slug !== profile.slug) permanentRedirect(`/journal/${encodeURIComponent(profile.slug)}`);
  const displayProfile = {
    ...profile,
    opportunities: uniqueOpportunitiesByCanonicalId(profile.opportunities),
  };
  const rankingRepo = getMagazineRankingRepository();
  const [rankings, telemetrySummary, editorialIntelligence] = await Promise.all([
    rankingRepo.getMagazineStanding(profile.id),
    rankingRepo.getTelemetrySummary(profile.id),
    getEditorialIntelligenceRepository().getIntelligenceForProfile(profile.id, profile.name),
  ]);
  const primary = (rankings as MagazineRankingRow[]).find((r: MagazineRankingRow) => r.genre === "overall") ?? rankings[0];
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  const opportunityActions: Record<string, ReactNode> = {};
  const opportunities = getOpportunityRepository();
  await Promise.all(displayProfile.opportunities.map(async item => {
    const detail = await opportunities.getById(item.id, session ? {accountId:session.account.id} : undefined).catch(() => null);
    if (!detail) return;
    opportunityActions[item.id] = <SaveToTrackerButton opportunityId={item.id} tracked={Boolean(detail.personal?.tracked)} signedIn={Boolean(session)} returnTo={`/journal/${encodeURIComponent(profile.slug)}#profile-opportunities`} opportunityTitle={item.title} />;
  }));
  return (
    <PublicSiteShell current="Directory">
      <InstitutionProfileView profile={displayProfile} opportunityActions={opportunityActions}
        rankingSummary={primary ? <div className="flex flex-wrap items-center gap-3 py-3 text-sm">
          <Link href="#profile-rankings">#{primary.rankPosition} {primary.genre === "overall" ? "Overall" : primary.genre} · {primary.totalScore} pts</Link>
          <RankingTierBadge tier={primary.prestigeTier} />
        </div> : undefined}
        journalDetails={<JournalProfileDetails profile={displayProfile} rankings={rankings} telemetrySummary={telemetrySummary} editorialIntelligence={editorialIntelligence} signedIn={Boolean(session)} />}
      />
    </PublicSiteShell>
  );
}
