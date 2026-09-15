import { notFound, redirect } from "next/navigation";
import { readUserHandle } from "@missa/radar-adapters";
import { cache } from "react";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { PublicCreatorProfile } from "@/components/public-creator-profile";
import { PublicSiteShell } from "@/components/public-site-shell";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Shared by generateMetadata and the page so the profile read happens once. */
const loadPublicProfile = cache(async (userId: string) => {
  if (!userId || userId.length > 200 || !process.env.DATABASE_URL) return null;
  const repo = getCreatorProfileRepository();
  return (await repo?.publicProfile(userId)) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await loadPublicProfile(userId);
  if (!profile || profile.isPrivate)
    return pageMetadata({
      title: "Creator profile",
      description:
        "This creator has not shared a public profile on Missa.",
      path: `/profile/${encodeURIComponent(userId)}`,
      noIndex: true,
    });
  const name = profile.displayName || "Creator";
  const description = profile.bio?.trim()
    ? profile.bio.slice(0, 300)
    : `${name} on Missa. Selected work, publications, and credits.`;
  return pageMetadata({
    title: `${name} — Creator profile`,
    description,
    path: `/profile/${encodeURIComponent(userId)}`,
  });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const publicProfile = await loadPublicProfile(userId);
  if (!publicProfile) notFound();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) notFound();
  const handle = await readUserHandle(databaseUrl, userId);
  if (!handle)
    return (
      <PublicSiteShell>
        <PublicCreatorProfile profile={publicProfile} />
      </PublicSiteShell>
    );
  redirect(`/@${handle.handleKey}`);
}
