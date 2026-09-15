import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  handleNamespaceAvailable,
  readUserHandle,
  waitlistClaimAccess,
  type UserHandle,
} from "@missa/radar-adapters";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import {
  getCreatorPreferenceRepository,
  getCreatorProfileRepository,
} from "@/lib/creatorRepositories";
import { getEngine } from "@/lib/engine";
import { CreatorOnboarding } from "@/components/creator-onboarding";
import {
  mapOpportunityTypesToInterestLabels,
  mapTaxonomyToPracticeLabels,
} from "@/lib/creatorOnboardingTaxonomy";

export const metadata = {
  title: "Set up your workspace · Missa",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  if (!session) {
    redirect("/login?next=/onboarding");
  }

  const preferenceRepo = getCreatorPreferenceRepository();
  let initialPractices: string[] = [];
  let initialRefinements: string[] = [];
  let initialInterests: string[] = [];
  let initialStep = 0;
  let initialStatus: "not_started" | "in_progress" | "completed" | "skipped" =
    "not_started";
  let initialDisplayName = session.account.displayName?.trim() ?? "";
  let initialProfileRevision: number | undefined;
  let initialHandle: UserHandle | null = null;
  let handleNamespaceReady = false;
  let handleClaimingOpen = false;

  if (preferenceRepo) {
    const profile = await getCreatorProfileRepository()?.profile(
      session.account.id,
    );
    if (profile) {
      initialDisplayName = profile.displayName;
      initialProfileRevision = profile.revision;
    }
    const productState = await preferenceRepo.productState(session.account.id);
    if (productState) {
      initialStatus = productState.onboardingStatus;
      initialStep = productState.onboardingStep;
    }

    const taxonomyPrefs = await preferenceRepo.taxonomyPreferences(
      session.account.id,
    );
    const oppPrefs = await preferenceRepo.opportunityPreferences(
      session.account.id,
    );

    const mapping = mapTaxonomyToPracticeLabels(
      taxonomyPrefs.map((t) => t.termId),
    );
    initialPractices = mapping.practices;
    initialRefinements = mapping.refinements;

    if (oppPrefs?.types) {
      initialInterests = mapOpportunityTypesToInterestLabels(oppPrefs.types);
    }
  } else {
    const engine = await getEngine();
    const user = engine.store.users.get(session.account.userId!);
    if (user) {
      initialDisplayName = user.displayName.trim();
      if (user.taxonomyPreferences) {
        const mapping = mapTaxonomyToPracticeLabels(
          user.taxonomyPreferences.map((t) => t.termId),
        );
        initialPractices = mapping.practices;
        initialRefinements = mapping.refinements;
      }
      if (user.opportunityPreferences?.types) {
        initialInterests = mapOpportunityTypesToInterestLabels(
          user.opportunityPreferences.types,
        );
      }
      const savedStatus = user.attributes.onboardingStatus;
      if (
        savedStatus === "skipped" ||
        savedStatus === "completed" ||
        savedStatus === "in_progress"
      ) {
        initialStatus = savedStatus;
        initialStep = Number(user.attributes.onboardingStep ?? 0);
      } else if (initialPractices.length > 0 || initialInterests.length > 0) {
        initialStatus = "completed";
      }
    }
  }

  if (process.env.DATABASE_URL && session.account.userId) {
    handleNamespaceReady = await handleNamespaceAvailable(
      process.env.DATABASE_URL,
    ).catch(() => false);
    if (handleNamespaceReady) {
      const [handle, access] = await Promise.all([
        readUserHandle(process.env.DATABASE_URL, session.account.userId).catch(
          () => null,
        ),
        waitlistClaimAccess({
          connectionString: process.env.DATABASE_URL,
          accountId: session.account.id,
        }).catch(() => ({ allowed: false })),
      ]);
      initialHandle = handle;
      handleClaimingOpen = access.allowed;
    }
  }

  return (
    <CreatorOnboarding
      initialDisplayName={initialDisplayName}
      initialProfileRevision={initialProfileRevision}
      initialHandle={initialHandle}
      handleNamespaceReady={handleNamespaceReady}
      handleClaimingOpen={handleClaimingOpen}
      initialPractices={initialPractices}
      initialRefinements={initialRefinements}
      initialInterests={initialInterests}
      initialStep={initialStep}
      initialStatus={initialStatus}
    />
  );
}
