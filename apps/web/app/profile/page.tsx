import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  handleNamespaceAvailable,
  readUserHandle,
  waitlistClaimAccess,
} from "@missa/radar-adapters";
import { profileSampleKindForWork } from "@missa/radar-engine";

import {
  ProfileEditor,
  type ProfileEditorData,
} from "@/components/profile-editor";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { getCreatorPreferenceRepository, getCreatorProfileRepository } from "@/lib/creatorRepositories";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId)
    redirect(`/login?next=${encodeURIComponent("/profile")}`);

  const relationalProfiles = getCreatorProfileRepository();
  const relationalPreferences = getCreatorPreferenceRepository();
  if (relationalProfiles && relationalPreferences) {
    const [creator, preferenceBundle, savedSearches, following, portfolio] = await Promise.all([
      relationalProfiles.profile(session.account.id),
      relationalPreferences.preferenceBundle(session.account.id),
      relationalPreferences.savedSearches(session.account.id, session.account.userId),
      relationalPreferences.follows(session.account.id),
      relationalProfiles.portfolioState(session.account.id),
    ]);
    if (!creator) notFound();
    const handleNamespaceReady = await handleNamespaceAvailable(process.env.DATABASE_URL!).catch(() => false);
    const currentHandle = handleNamespaceReady ? await readUserHandle(process.env.DATABASE_URL!, creator.userId).catch(() => null) : null;
    const claimingAccess = handleNamespaceReady
      ? await waitlistClaimAccess({ connectionString: process.env.DATABASE_URL!, accountId: session.account.id }).catch(() => ({ allowed: false }))
      : { allowed: false };
    const profile: ProfileProductData = {
      id: creator.userId,
      displayName: creator.displayName,
      ...(creator.bio ? { bio: creator.bio } : {}),
      revision: creator.revision,
      publicUrl: `/profile/${encodeURIComponent(creator.userId)}`,
      handle: { namespaceAvailable: handleNamespaceReady, current: currentHandle, claimingOpen: claimingAccess.allowed, promptDismissed: false, published: Boolean(portfolio.publishedAt) },
      privacy: { displayName: creator.privacy.displayName, bio: creator.privacy.bio },
      taxonomyPreferences: preferenceBundle?.taxonomyPreferences ?? [],
      preferencesRevision: preferenceBundle?.revision,
      opportunityPreferences: preferenceBundle?.opportunityPreferences ?? {
        types: [], disciplines: [], genres: [], locations: [], careerStages: [], noFeeOnly: false, simultaneousRequired: false,
      },
    };
    return (
      <div className="min-h-screen bg-white">
        <AppNav
          email={session.account.email}
          userId={creator.userId}
          isAdmin={session.account.isAdmin}
          organizations={session.memberships.map((membership) => ({ id: membership.organizationId, name: membership.organizationId }))}
        />
        <ProfileProduct initialSection={initialSection} initialProfile={profile} savedSearches={savedSearches} following={following} />
      </div>
    );
  }

  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user) notFound();
  const handleNamespaceReady = process.env.DATABASE_URL
    ? await handleNamespaceAvailable(process.env.DATABASE_URL).catch(
        () => false,
      )
    : false;
  const currentHandle = handleNamespaceReady
    ? await readUserHandle(process.env.DATABASE_URL!, user.id).catch(() => null)
    : null;
  const claimingAccess = handleNamespaceReady
    ? await waitlistClaimAccess({
        connectionString: process.env.DATABASE_URL!,
        accountId: session.account.id,
      }).catch(() => ({ allowed: false }))
    : { allowed: false };
  const handle = currentHandle?.displayHandle.replace(/^@/u, "");
  const publicUrl = handle
    ? `/@${encodeURIComponent(handle)}`
    : process.env.DATABASE_URL
      ? undefined
      : `/profile/${encodeURIComponent(user.id)}`;
  const profile: ProfileEditorData = {
    id: user.id,
    displayName: user.displayName.trim(),
    ...(user.bio?.trim() ? { bio: user.bio.trim() } : {}),
    ...(handle ? { handle } : {}),
    ...(publicUrl ? { publicUrl } : {}),
    handleNamespaceAvailable: handleNamespaceReady,
    handleClaimingOpen: claimingAccess.allowed,
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
