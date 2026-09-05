import { notFound } from "next/navigation";
import { resolveHandle } from "@missa/radar-adapters";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import { PublicCreatorProfile } from "@/components/public-creator-profile";

export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const rawHandle = (await params).handle;
  if (!rawHandle.startsWith("@") || !process.env.DATABASE_URL) notFound();
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    rawHandle.slice(1),
  ).catch(() => null);
  if (
    !resolved ||
    resolved.resolution !== "canonical" ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    notFound();
  const engine = await getEngine();
  const user = engine.store.users.get(resolved.subjectId);
  const profile = user ? engine.publicUserProfile(user.id) : undefined;
  if (!user?.publicProfilePublishedAt || !profile || profile.isPrivate)
    notFound();

  return (
    <PublicSiteShell>
      <PublicCreatorProfile profile={profile} />
    </PublicSiteShell>
  );
}
