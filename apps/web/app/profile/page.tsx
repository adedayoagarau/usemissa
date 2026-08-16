import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readUserHandle } from "@missa/radar-adapters";
import { profileSampleKindForWork } from "@missa/radar-engine";

import {
  ProfileEditor,
  type ProfileEditorData,
} from "@/components/profile-editor";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId)
    redirect(`/login?next=${encodeURIComponent("/profile")}`);

  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user) notFound();
  const currentHandle = process.env.DATABASE_URL
    ? await readUserHandle(process.env.DATABASE_URL, user.id).catch(() => null)
    : null;
  const handle = currentHandle?.displayHandle.replace(/^@/u, "");
  const publicUrl = handle
    ? `/@${encodeURIComponent(handle)}`
    : `/profile/${encodeURIComponent(user.id)}`;
  const profile: ProfileEditorData = {
    id: user.id,
    displayName: user.displayName.trim(),
    ...(user.bio?.trim() ? { bio: user.bio.trim() } : {}),
    ...(handle ? { handle } : {}),
    publicUrl,
    published: Boolean(user.publicProfilePublishedAt),
    ...(user.publicPortfolio ? { publicPortfolio: user.publicPortfolio } : {}),
    libraryWorks: engine.library(user.id).works.map((work) => {
      const file = work.fileId
        ? engine.store.libraryFiles.get(work.fileId)
        : undefined;
      return {
        id: work.id,
        title: work.title,
        ...(work.description ? { description: work.description } : {}),
        ...(profileSampleKindForWork(work, file)
          ? { sampleKind: profileSampleKindForWork(work, file) }
          : {}),
        ...(file && file.userId === user.id
          ? {
              file: {
                id: file.id,
                filename: file.filename,
                contentType: file.contentType,
              },
            }
          : {}),
      };
    }),
  };
  const organizations = session.memberships.map((membership) => ({
    id: membership.organizationId,
    name:
      engine.store.organizations.get(membership.organizationId)?.name ??
      membership.organizationId,
  }));

  return (
    <ProfileEditor
      initialProfile={profile}
      nav={{
        email: session.account.email,
        userId: session.account.userId,
        isAdmin: session.account.isAdmin,
        organizations,
      }}
    />
  );
}
