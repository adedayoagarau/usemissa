import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  handleNamespaceAvailable,
  readUserHandle,
  waitlistClaimAccess,
} from "@missa/radar-adapters";

import { CreatorShell } from "@/components/creator-shell";
import {
  ProfileProduct,
  type ProfileProductData,
} from "@/components/profile-product";
import { normalizeProfileSection } from "@/lib/profile-settings";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import { emailIntegrationFlags } from "@/lib/email-integrations";
import { notificationPreferencesView } from "@/lib/sms-preferences";
import { creatorShellOrganizations } from "@/lib/creatorShellOrganizations";
import {
  getCreatorPreferenceRepository,
  getCreatorProfileRepository,
} from "@/lib/creatorRepositories";

export const metadata = {
  title: "Your Missa profile",
  description:
    "Your identity, preferences, privacy, and public preview settings in Missa.",
  robots: { index: false, follow: false },
};

function sectionFrom(value: string | string[] | undefined) {
  return normalizeProfileSection(Array.isArray(value) ? value[0] : value);
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSection = sectionFrom(params.section);
  const returnPath =
    initialSection === "profile"
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
    const [
      creator,
      preferenceBundle,
      savedSearches,
      following,
      portfolio,
      notificationPreferences,
    ] = await Promise.all([
      relationalProfiles.profile(session.account.id),
      relationalPreferences.preferenceBundle(session.account.id),
      relationalPreferences.savedSearches(
        session.account.id,
        session.account.userId,
      ),
      relationalPreferences.follows(session.account.id),
      relationalProfiles.portfolioState(session.account.id),
      notificationPreferencesView(session.account.id).catch(() => undefined),
    ]);
    if (!creator) notFound();
    const handleNamespaceReady = await handleNamespaceAvailable(
      process.env.DATABASE_URL!,
    ).catch(() => false);
    const currentHandle = handleNamespaceReady
      ? await readUserHandle(process.env.DATABASE_URL!, creator.userId).catch(
          () => null,
        )
      : null;
    const claimingAccess = handleNamespaceReady
      ? await waitlistClaimAccess({
          connectionString: process.env.DATABASE_URL!,
          accountId: session.account.id,
        }).catch(() => ({ allowed: false }))
      : { allowed: false };
    const profile: ProfileProductData = {
      id: creator.userId,
      displayName: creator.displayName,
      ...(creator.bio ? { bio: creator.bio } : {}),
      revision: creator.revision,
      publicUrl: `/profile/${encodeURIComponent(creator.userId)}`,
      handle: {
        namespaceAvailable: handleNamespaceReady,
        current: currentHandle,
        claimingOpen: claimingAccess.allowed,
        promptDismissed: false,
        published: Boolean(portfolio.publishedAt),
      },
      privacy: {
        displayName: creator.privacy.displayName,
        bio: creator.privacy.bio,
      },
      taxonomyPreferences: preferenceBundle?.taxonomyPreferences ?? [],
      preferencesRevision: preferenceBundle?.revision,
      opportunityPreferences: preferenceBundle?.opportunityPreferences ?? {
        types: [],
        disciplines: [],
        genres: [],
        locations: [],
        careerStages: [],
        noFeeOnly: false,
        simultaneousRequired: false,
      },
    };
    const organizations = await creatorShellOrganizations(session.memberships);
    return (
      <CreatorShell
        email={session.account.email}
        organizations={organizations}
        isAdmin={session.account.isAdmin}
      >
        <ProfileProduct
          initialSection={initialSection}
          initialProfile={profile}
          savedSearches={savedSearches}
          following={following}
          email={session.account.email}
          notificationPreferences={notificationPreferences}
          integrations={emailIntegrationFlags()}
        />
      </CreatorShell>
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
  const organizations = await creatorShellOrganizations(session.memberships);
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
    <CreatorShell
      email={session.account.email}
      organizations={organizations}
      isAdmin={session.account.isAdmin}
    >
      <ProfileProduct
        initialSection={initialSection}
        initialProfile={profile}
        savedSearches={savedSearches}
        following={following}
        email={session.account.email}
        integrations={emailIntegrationFlags()}
      />
    </CreatorShell>
  );
}
