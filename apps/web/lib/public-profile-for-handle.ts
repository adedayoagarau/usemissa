import { resolveHandle } from "@missa/radar-adapters";

import { getEngine } from "@/lib/engine";
import { publicProfileHandleRoute } from "@/lib/profile-handle-routing";

export async function publicProfileForHandle(rawHandle: string) {
  if (!rawHandle.startsWith("@") || !process.env.DATABASE_URL) return null;
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    rawHandle.slice(1),
  ).catch(() => null);
  if (!resolved) return null;
  const route = publicProfileHandleRoute(rawHandle, resolved);
  if (!route) return null;
  const engine = await getEngine();
  const user = engine.store.users.get(resolved.subjectId);
  if (!user?.publicProfilePublishedAt) return null;
  const profile = engine.publicUserProfile(user.id);
  if (!profile || profile.isPrivate) return null;
  return {
    ...route,
    profile,
  };
}
