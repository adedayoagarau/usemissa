import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionProfileView } from "@/components/institution-profile-view";
import { notFound, permanentRedirect } from "next/navigation";
import { canonicalProfileRedirect } from "@/lib/profileRouteKind";
import type { Metadata } from "next";
import { missingProfileMetadata, ProfileJsonLd, profileMetadata } from "@/lib/profileSeo";

/**
 * Served from the CDN: each page is generated on its first visit and then
 * regenerated at most every five minutes.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) return missingProfileMetadata();
  return profileMetadata(profile);
}

export default async function GrantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) notFound();
  const canonicalPath = canonicalProfileRedirect(profile, { kind: "grant_foundation", slug });
  if (canonicalPath) permanentRedirect(canonicalPath);

  return (
    <PublicSiteShell current="Directory">
      <ProfileJsonLd profile={profile} />
      <InstitutionProfileView profile={profile} />
    </PublicSiteShell>
  );
}
