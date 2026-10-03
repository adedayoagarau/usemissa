import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionProfileView } from "@/components/institution-profile-view";
import { notFound, permanentRedirect } from "next/navigation";
import { canonicalProfileRedirect } from "@/lib/profileRouteKind";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) return { title: "Press Not Found" };
  return {
    title: `${profile.name} — Small & Independent Press`,
    description: profile.summary || `Manuscript submissions, catalog details, and book publishing with ${profile.name}.`,
  };
}

export default async function PressDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) notFound();
  const canonicalPath = canonicalProfileRedirect(profile, { kind: "small_press", slug });
  if (canonicalPath) permanentRedirect(canonicalPath);

  return (
    <PublicSiteShell current="Directory">
      <InstitutionProfileView profile={profile} />
    </PublicSiteShell>
  );
}
