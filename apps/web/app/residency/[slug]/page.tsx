import { getProfileRepository } from "@/lib/profileRepository";
import { PublicSiteShell } from "@/components/public-site-shell";
import { InstitutionProfileView } from "@/components/institution-profile-view";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) return { title: "Residency Not Found — Missa" };
  return {
    title: `${profile.name} — Artist Residency Program`,
    description: profile.summary || `Explore residency opportunities, open calls, and facilities at ${profile.name}.`,
  };
}

export default async function ResidencyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = getProfileRepository();
  const profile = repo ? await repo.getById(slug) : null;
  if (!profile) notFound();

  return (
    <PublicSiteShell current="Directory">
      <InstitutionProfileView profile={profile} />
    </PublicSiteShell>
  );
}
