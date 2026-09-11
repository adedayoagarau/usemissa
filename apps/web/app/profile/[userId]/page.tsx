import { notFound, redirect } from "next/navigation";
import { readUserHandle } from "@missa/radar-adapters";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { PublicCreatorProfile } from "@/components/public-creator-profile";
import { PublicSiteShell } from "@/components/public-site-shell";
export const dynamic = "force-dynamic";
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || !process.env.DATABASE_URL) notFound();
  const repo = getCreatorProfileRepository();
  const publicProfile = await repo?.publicProfile(userId);
  if (!publicProfile) notFound();
  const handle = await readUserHandle(process.env.DATABASE_URL, userId);
  if (!handle)
    return (
      <PublicSiteShell>
        <PublicCreatorProfile profile={publicProfile} />
      </PublicSiteShell>
    );
  redirect(`/@${handle.handleKey}`);
}
