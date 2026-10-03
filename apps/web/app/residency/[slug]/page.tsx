import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionProfileView } from "@/components/institution-profile-view";
import { ResidencyIntelligenceDrawer } from "@/components/rankings/residency-intelligence-drawer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSemanticUrlForProfile } from "@missa/radar-adapters";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) return { title: "Residency Not Found", robots: { index: false, follow: true } };
  return pageMetadata({
    title: `${profile.name} — Artist Residency Program`,
    description: profile.summary || `Explore residency opportunities, open calls, and facilities at ${profile.name}.`,
    path: getSemanticUrlForProfile(profile.kind, profile.slug),
  });
}

export default async function ResidencyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) notFound();

  return (
    <PublicSiteShell current="Directory">
      <InstitutionProfileView
        profile={profile}
        rankingSummary={
          <div className="flex items-center gap-3 pt-2">
            <ResidencyIntelligenceDrawer
              profileId={profile.id}
              residencyName={profile.name}
              residencySlug={profile.slug}
            />
          </div>
        }
      />
    </PublicSiteShell>
  );
}
