import { notFound } from "next/navigation";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import { PublicCreatorProfile } from "@/components/public-creator-profile";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || /[^a-zA-Z0-9_-]/u.test(userId))
    notFound();
  const repository = getCreatorProfileRepository();
  const profile = repository
    ? await repository.publicProfile(userId)
    : (await getEngine()).publicUserProfile(userId);
  if (!profile) notFound();

  return (
    <PublicSiteShell>
      <PublicCreatorProfile profile={profile} />
    </PublicSiteShell>
  );
}
