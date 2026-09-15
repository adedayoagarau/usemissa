import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CANONICAL_COUNTRIES,
  creatorOnboardingMutationSchema,
} from "@missa/contracts";
import {
  getSessionAccountFromToken,
  SESSION_COOKIE,
} from "../../../../lib/auth";
import {
  getCreatorAccountRepository,
  getCreatorPreferenceRepository,
  getCreatorProfileRepository,
} from "../../../../lib/creatorRepositories";
import { getEngine, persistRadar } from "../../../../lib/engine";
import { creatorCommandEnvelope } from "@missa/radar-adapters";
import {
  mapInterestsToOpportunityTypes,
  mapOpportunityTypesToInterestLabels,
  mapPracticesToTaxonomy,
  mapTaxonomyToPracticeLabels,
} from "../../../../lib/creatorOnboardingTaxonomy";

const FIRST_SAVE_INTENT_COOKIE = "missa_first_save";
const noStore = { "Cache-Control": "no-store" };

async function sessionForRequest() {
  const cookieStore = await cookies();
  return getSessionAccountFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const session = await sessionForRequest();
  if (!session?.account.id) {
    return NextResponse.json(
      {
        authenticated: false,
        status: "not_started",
        step: 0,
        practices: [],
        refinements: [],
        interests: [],
      },
      { headers: noStore },
    );
  }

  const preferenceRepo = getCreatorPreferenceRepository();
  const cookieStore = await cookies();
  const firstSaveToken = cookieStore.get(FIRST_SAVE_INTENT_COOKIE)?.value;
  let firstSaveIntent = undefined;
  if (firstSaveToken) {
    try {
      const { verifyFirstSaveIntent } =
        await import("../../../../lib/firstSaveIntent");
      firstSaveIntent = verifyFirstSaveIntent(firstSaveToken);
    } catch {
      firstSaveIntent = undefined;
    }
  }

  let status: "not_started" | "in_progress" | "completed" | "skipped" =
    "not_started";
  let step = 0;
  let completedAt: string | undefined;
  let skippedAt: string | undefined;
  let practices: string[] = [];
  let refinements: string[] = [];
  let interests: string[] = [];
  let givenName = session.account.givenName?.trim() ?? "";
  let familyName = session.account.familyName?.trim() ?? "";
  let usesSingleName = session.account.usesSingleName ?? false;
  let countryCode = "";
  let city = "";
  let timezone = "";
  let careerStage:
    "student" | "emerging" | "mid-career" | "established" | "any" = "any";
  let travelWillingness:
    "remote-only" | "willing-to-travel" | "local-only" | "any" = "any";
  let noFeeOnly = false;

  if (preferenceRepo) {
    const profile = await getCreatorProfileRepository()?.profile(
      session.account.id,
    );
    if (profile) {
      givenName = profile.givenName ?? givenName;
      familyName = profile.familyName ?? familyName;
      usesSingleName = profile.usesSingleName;
      countryCode = profile.countryCode ?? "";
      city = profile.city ?? "";
      timezone = profile.timezone ?? "";
    }
    const productState = await preferenceRepo.productState(session.account.id);
    if (productState) {
      status = productState.onboardingStatus;
      step = productState.onboardingStep;
      completedAt = productState.completedAt;
      skippedAt = productState.skippedAt;
    }

    const taxonomyPrefs = await preferenceRepo.taxonomyPreferences(
      session.account.id,
    );
    const oppPrefs = await preferenceRepo.opportunityPreferences(
      session.account.id,
    );

    const practiceMapping = mapTaxonomyToPracticeLabels(
      taxonomyPrefs.map((t) => t.termId),
    );
    practices = practiceMapping.practices;
    refinements = practiceMapping.refinements;

    if (oppPrefs?.types) {
      interests = mapOpportunityTypesToInterestLabels(oppPrefs.types);
    }
    careerStage =
      (oppPrefs?.careerStages[0] as typeof careerStage | undefined) ?? "any";
    travelWillingness = oppPrefs?.travelWillingness ?? "any";
    noFeeOnly = oppPrefs?.noFeeOnly ?? false;
  } else {
    const engine = await getEngine();
    const user = engine.store.users.get(session.account.userId!);
    if (user) {
      if (user.taxonomyPreferences) {
        const practiceMapping = mapTaxonomyToPracticeLabels(
          user.taxonomyPreferences.map((t) => t.termId),
        );
        practices = practiceMapping.practices;
        refinements = practiceMapping.refinements;
      }
      if (user.opportunityPreferences?.types) {
        interests = mapOpportunityTypesToInterestLabels(
          user.opportunityPreferences.types,
        );
      }
      const savedStatus = user.attributes.onboardingStatus;
      if (
        savedStatus === "skipped" ||
        savedStatus === "completed" ||
        savedStatus === "in_progress"
      ) {
        status = savedStatus;
        step = Number(user.attributes.onboardingStep ?? 0);
      } else if (practices.length > 0 || interests.length > 0) {
        status = "completed";
        step = 2;
      }
    }
  }

  // Derive one meaningful next action
  let nextAction: {
    label: string;
    description: string;
    href: string;
    kind:
      "resume-save" | "explore-matches" | "prepare-opportunity" | "browse-all";
  };

  if (firstSaveIntent) {
    nextAction = {
      kind: "resume-save",
      label: `Prepare ${firstSaveIntent.context.title}`,
      description:
        "Review deadline and application details in your private workspace.",
      href: "/tracker",
    };
  } else if (practices.length > 0) {
    nextAction = {
      kind: "explore-matches",
      label: `Explore ${practices.join(" & ")} opportunities`,
      description: "Opportunities based on the work you make.",
      href: "/tracker",
    };
  } else {
    nextAction = {
      kind: "browse-all",
      label: "Explore all open calls",
      description: "Start exploring upcoming deadlines across disciplines.",
      href: "/tracker",
    };
  }

  return NextResponse.json(
    {
      authenticated: true,
      status,
      step,
      practices,
      refinements,
      interests,
      givenName,
      familyName,
      usesSingleName,
      countryCode,
      city,
      timezone,
      careerStage,
      travelWillingness,
      noFeeOnly,
      completedAt,
      skippedAt,
      nextAction,
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const session = await sessionForRequest();
  if (!session?.account.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401, headers: noStore },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400, headers: noStore },
    );
  }

  const parseResult = creatorOnboardingMutationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid onboarding payload.",
        issues: parseResult.error.issues,
      },
      { status: 400, headers: noStore },
    );
  }

  const data = parseResult.data;
  if (data.countryCode && !CANONICAL_COUNTRIES[data.countryCode]) {
    return NextResponse.json(
      { error: "Choose a country from the list." },
      { status: 400, headers: noStore },
    );
  }
  if (data.action === "complete") {
    if (!data.givenName || (!data.usesSingleName && !data.familyName)) {
      return NextResponse.json(
        { error: "Enter your name before finishing setup." },
        { status: 400, headers: noStore },
      );
    }
    if (!data.countryCode || !data.timezone) {
      return NextResponse.json(
        { error: "Add your country and time zone before finishing setup." },
        { status: 400, headers: noStore },
      );
    }
  }
  const preferenceRepo = getCreatorPreferenceRepository();
  const profileRepo = getCreatorProfileRepository();
  // Relational creator repositories are the durable authority. Loading and
  // persisting the legacy engine alongside them can turn a successful creator
  // write into a failed response when its unrelated snapshot is stale.
  const engine = preferenceRepo ? undefined : await getEngine();
  const now = new Date().toISOString();

  if (data.action === "skip") {
    if (preferenceRepo) {
      await preferenceRepo.upsertProductState(session.account.id, {
        onboardingStatus: "skipped",
        skippedAt: now,
        onboardingStep: data.step ?? 0,
        lastRoute: data.lastRoute ?? "/tracker",
      });
    }

    if (!preferenceRepo && session.account.userId) {
      const user = engine!.store.users.get(session.account.userId);
      if (user) {
        user.attributes.onboardingStatus = "skipped";
        user.attributes.onboardingStep = String(data.step ?? 0);
        await persistRadar();
      }
    }
    return NextResponse.json(
      {
        success: true,
        status: "skipped",
        redirectUrl: "/tracker",
      },
      { headers: noStore },
    );
  }

  // Handle save_step or complete
  const taxonomyPreferences = mapPracticesToTaxonomy(
    data.practices,
    data.refinements,
  );
  const opportunityTypes = mapInterestsToOpportunityTypes(data.interests);

  const isComplete = data.action === "complete";
  const newStatus = isComplete ? "completed" : "in_progress";
  const currentStep = data.step ?? (isComplete ? 4 : 1);

  if (preferenceRepo && profileRepo) {
    // Read current bundle for revision
    const bundle = await preferenceRepo.preferenceBundle(session.account.id);
    const expectedRevision = bundle?.revision ?? 1;

    const existingOpportunity = bundle?.opportunityPreferences ?? {
      types: [],
      disciplines: [],
      genres: [],
      locations: [],
      careerStages: [],
      noFeeOnly: false,
      simultaneousRequired: false,
    };

    const updatedOpportunity = {
      ...existingOpportunity,
      types:
        opportunityTypes.length > 0
          ? opportunityTypes
          : existingOpportunity.types,
      disciplines:
        data.practices.length > 0
          ? data.practices
          : existingOpportunity.disciplines,
      genres:
        data.refinements.length > 0
          ? data.refinements
          : existingOpportunity.genres,
      locations: data.countryCode
        ? [data.countryCode]
        : existingOpportunity.locations,
      careerStages: data.careerStage === "any" ? [] : [data.careerStage],
      travelWillingness: data.travelWillingness,
      noFeeOnly: data.noFeeOnly,
    };

    const idempotencyKey = `onboarding-${session.account.id}-${Date.now()}`;
    const envelope = creatorCommandEnvelope(
      session.account.id,
      "creator-preferences.update",
      idempotencyKey,
      { taxonomyPreferences, opportunityPreferences: updatedOpportunity },
      expectedRevision,
    );

    try {
      await preferenceRepo.updatePreferences(
        envelope,
        taxonomyPreferences,
        updatedOpportunity,
      );
    } catch (err) {
      console.error("Preference update failed:", err);
      return NextResponse.json(
        {
          error: "Could not save your preferences. Please try again.",
        },
        { status: 503, headers: noStore },
      );
    }

    if (data.givenName && data.countryCode && data.timezone) {
      const familyName = data.usesSingleName
        ? undefined
        : data.familyName?.trim();
      try {
        await getCreatorAccountRepository()?.updateOnboardingProfile(
          session.account.id,
          {
            givenName: data.givenName,
            familyName,
            usesSingleName: data.usesSingleName,
            displayName: [data.givenName, familyName].filter(Boolean).join(" "),
            countryCode: data.countryCode,
            countryName: CANONICAL_COUNTRIES[data.countryCode],
            city: data.city,
            timezone: data.timezone,
          },
        );
      } catch (err) {
        console.error("Onboarding profile update failed:", err);
        return NextResponse.json(
          { error: "We could not save your profile. Please try again." },
          { status: 503, headers: noStore },
        );
      }
    }

    await preferenceRepo.upsertProductState(session.account.id, {
      onboardingStatus: newStatus,
      onboardingStep: currentStep,
      completedAt: isComplete ? now : null,
      primaryPractice: data.primaryPractice ?? data.practices[0] ?? null,
      secondaryPractices: data.practices.slice(1),
      lastRoute: data.lastRoute ?? "/tracker",
    });
  }

  // The in-memory engine is the fallback only when relational creator storage
  // is unavailable. It must not compete with the durable creator records.
  if (!preferenceRepo && session.account.userId) {
    let user = engine!.store.users.get(session.account.userId);
    if (!user) {
      user = {
        id: session.account.userId,
        displayName: session.account.displayName || "Creative Practitioner",
        attributes: {},
        genres: data.refinements,
        taxonomyPreferences: taxonomyPreferences.map((t) => ({
          termId: t.termId,
          preference: t.preference,
          weight: t.weight,
        })),
        opportunityPreferences: {
          types: opportunityTypes,
          disciplines: data.practices,
          genres: data.refinements,
          locations: data.countryCode ? [data.countryCode] : [],
          careerStages: data.careerStage === "any" ? [] : [data.careerStage],
          noFeeOnly: data.noFeeOnly,
          travelWillingness: data.travelWillingness,
          simultaneousRequired: false,
        },
      };
      engine!.store.users.set(session.account.userId, user);
    } else {
      user.genres = data.refinements;
      user.taxonomyPreferences = taxonomyPreferences.map((t) => ({
        termId: t.termId,
        preference: t.preference,
        weight: t.weight,
      }));
      if (user.opportunityPreferences) {
        user.opportunityPreferences.types = opportunityTypes;
        user.opportunityPreferences.disciplines = data.practices;
        user.opportunityPreferences.genres = data.refinements;
        user.opportunityPreferences.locations = data.countryCode
          ? [data.countryCode]
          : user.opportunityPreferences.locations;
        user.opportunityPreferences.careerStages =
          data.careerStage === "any" ? [] : [data.careerStage];
        user.opportunityPreferences.travelWillingness = data.travelWillingness;
        user.opportunityPreferences.noFeeOnly = data.noFeeOnly;
      }
    }
    if (data.givenName) {
      const familyName = data.usesSingleName
        ? undefined
        : data.familyName?.trim();
      const displayName = [data.givenName, familyName]
        .filter(Boolean)
        .join(" ");
      user.displayName = displayName;
      session.account.displayName = displayName;
      session.account.givenName = data.givenName;
      session.account.familyName = familyName;
      session.account.usesSingleName = data.usesSingleName;
      user.attributes.countryCode = data.countryCode ?? "";
      user.attributes.city = data.city ?? "";
      user.attributes.timezone = data.timezone ?? "";
    }
    user.attributes.onboardingStatus = newStatus;
    user.attributes.onboardingStep = String(currentStep);
    await persistRadar();
  }

  return NextResponse.json(
    {
      success: true,
      status: newStatus,
      step: currentStep,
      redirectUrl: "/tracker",
    },
    { headers: noStore },
  );
}
