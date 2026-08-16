import { resolveHandle } from "@missa/radar-adapters";

import { getEngine } from "@/lib/engine";

export async function publicProfileForHandle(rawHandle: string) {
  if (!rawHandle.startsWith("@") || !process.env.DATABASE_URL) return null;
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
    return null;
  const engine = await getEngine();
  const user = engine.store.users.get(resolved.subjectId);
  if (!user?.publicProfilePublishedAt) return null;
  const profile = engine.publicUserProfile(user.id);
  if (!profile || profile.isPrivate) return null;
  const handle = rawHandle.slice(1);
  return {
    handle,
    path: `/@${handle}`,
    profile,
  };
}
