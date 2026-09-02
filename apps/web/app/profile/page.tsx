import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  handleNamespaceAvailable,
  readUserHandle,
  waitlistClaimAccess,
} from "@missa/radar-adapters";

import { AppNav } from "@/components/app-nav";
import {
  ProfileProduct,
  type ProfileProductData,
  type ProfileSection,
} from "@/components/profile-product";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { getCreatorPreferenceRepository, getCreatorProfileRepository } from "@/lib/creatorRepositories";

const PROFILE_SECTION_VALUES: readonly ProfileSection[] = [
  "overview",
  "identity",
  "preferences",
  "privacy",
  "integrations",
  "searches",
  "following",
  "data",
];

function sectionFrom(value: string | string[] | undefined): ProfileSection {
  const candidate = Array.isArray(value) ? value[0] : value;
  return PROFILE_SECTION_VALUES.includes(candidate as ProfileSection)
    ? (candidate as ProfileSection)
    : "overview";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSection = sectionFrom(params.section);
  const returnPath =
    initialSection === "overview"
      ? "/profile"
      : `/profile?section=${encodeURIComponent(initialSection)}`;
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId)
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);

  const relationalProfiles = getCreatorProfileRepository();
  const relationalPreferences = getCreatorPreferenceRepository();
  if (relationalProfiles && relationalPreferences) {
    const [creator, preferenceBundle, savedSearches, following] = await Promise.all([
      relationalProfiles.profile(session.account.id),
      relationalPreferences.preferenceBundle(session.account.id),
      relationalPreferences.savedSearches(session.account.id, session.account.userId),
      relationalPreferences.follows(session.account.id),
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
      handle: { namespaceAvailable: handleNamespaceReady, current: currentHandle, claimingOpen: claimingAccess.allowed, promptDismissed: false, published: false },
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
  const settings = engine.profilePrivacy(user.id);
  if (!settings) notFound();
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

  const profile: ProfileProductData = {
    id: user.id,
    displayName: user.displayName.trim(),
    ...(user.bio?.trim() ? { bio: user.bio.trim() } : {}),
    publicUrl: `/profile/${encodeURIComponent(user.id)}`,
    handle: {
      namespaceAvailable: handleNamespaceReady,
      current: currentHandle,
      claimingOpen: claimingAccess.allowed,
      promptDismissed: Boolean(user.handlePromptDismissedAt),
      published: Boolean(user.publicProfilePublishedAt),
    },
    privacy: { displayName: settings.displayName, bio: settings.bio },
    taxonomyPreferences: user.taxonomyPreferences ?? [],
    opportunityPreferences: user.opportunityPreferences ?? {
      types: [],
      disciplines: [],
      genres: [],
      locations: [],
      careerStages: [],
      noFeeOnly: false,
      simultaneousRequired: false,
    },
  };
  const organizations = session.memberships.map((membership) => ({
    id: membership.organizationId,
    name:
      engine.store.organizations.get(membership.organizationId)?.name ??
      membership.organizationId,
  }));
  const savedSearches = [...engine.store.radarProfiles.values()].filter(
    (saved) => saved.userId === user.id,
  );
  const following = engine.store.follows
    .filter((follow) => follow.userId === user.id)
    .map((follow) => ({
      organizationId: follow.organizationId,
      organizationName:
        engine.store.organizations.get(follow.organizationId)?.name ??
        follow.organizationId,
      followedAt: follow.followedAt,
    }));

  return (
    <div className="min-h-screen bg-white">
      <AppNav
        email={session.account.email}
        userId={session.account.userId}
        isAdmin={session.account.isAdmin}
        organizations={organizations}
      />
      <ProfileProduct
        initialSection={initialSection}
        initialProfile={profile}
        savedSearches={savedSearches}
        following={following}
      />
    </div>
  );
}
