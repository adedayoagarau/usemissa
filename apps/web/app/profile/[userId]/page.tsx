import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { readUserHandle } from "@missa/radar-adapters";

import { PublicProfileView } from "@/components/public-profile-view";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

function validUserId(userId: string): boolean {
  return Boolean(
    userId && userId.length <= 200 && !/[^a-zA-Z0-9_-]/u.test(userId),
  );
}

async function legacyProfile(userId: string) {
  if (!validUserId(userId)) return null;
  const engine = await getEngine();
  const user = engine.store.users.get(userId);
  if (!user) return null;
  if (process.env.DATABASE_URL) {
    const handle = await readUserHandle(process.env.DATABASE_URL, userId).catch(
      () => null,
    );
    if (!handle) return null;
    return {
      user,
      canonicalPath: `/@${encodeURIComponent(handle.handleKey)}`,
      profile: user.publicProfilePublishedAt
        ? engine.publicUserProfile(userId)
        : { isPrivate: true as const },
    };
  }
  if (!user.publicProfilePublishedAt)
    return { user, profile: { isPrivate: true as const } };
  return { user, profile: engine.publicUserProfile(userId) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const result = await legacyProfile(userId);
  const profile = result?.profile;
  if (!profile || profile.isPrivate)
    return pageMetadata({
      title: "Private Profile",
      description: "This Profile is private.",
      path: `/profile/${encodeURIComponent(userId)}`,
      noIndex: true,
    });
  return pageMetadata({
    title: profile.displayName ?? "Creator Profile",
    description:
      profile.oneLine ?? profile.bio ?? "A creator portfolio on Missa.",
    path: `/profile/${encodeURIComponent(userId)}`,
    noIndex: true,
  });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const result = await legacyProfile(userId);
  if (!result?.profile) notFound();
  if ("canonicalPath" in result && result.canonicalPath)
    redirect(result.canonicalPath);
  const path = `/profile/${encodeURIComponent(userId)}`;
  return (
    <PublicSiteShell current="profile">
      <PublicProfileView
        profile={result.profile}
        shareUrl={absoluteUrl(path)}
      />
    </PublicSiteShell>
  );
}
