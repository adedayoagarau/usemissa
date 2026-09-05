import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { creatorOnboardingMutationSchema } from "@missa/contracts";
import { getSessionAccountFromToken, SESSION_COOKIE } from "../../../../lib/auth";
import { getCreatorPreferenceRepository, getCreatorProfileRepository } from "../../../../lib/creatorRepositories";
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
      { headers: noStore }
    );
  }

  const preferenceRepo = getCreatorPreferenceRepository();
  const cookieStore = await cookies();
  const firstSaveToken = cookieStore.get(FIRST_SAVE_INTENT_COOKIE)?.value;
  let firstSaveIntent = undefined;
  if (firstSaveToken) {
    try {
      const { verifyFirstSaveIntent } = await import("../../../../lib/firstSaveIntent");
      firstSaveIntent = verifyFirstSaveIntent(firstSaveToken);
    } catch {
      firstSaveIntent = undefined;
    }
  }

  let status: "not_started" | "in_progress" | "completed" | "skipped" = "not_started";
  let step = 0;
  let completedAt: string | undefined;
  let skippedAt: string | undefined;
  let practices: string[] = [];
  let refinements: string[] = [];
  let interests: string[] = [];

  if (preferenceRepo) {
    const productState = await preferenceRepo.productState(session.account.id);
    if (productState) {
      status = productState.onboardingStatus;
      step = productState.onboardingStep;
      completedAt = productState.completedAt;
      skippedAt = productState.skippedAt;
    }

    const taxonomyPrefs = await preferenceRepo.taxonomyPreferences(session.account.id);
    const oppPrefs = await preferenceRepo.opportunityPreferences(session.account.id);

    const practiceMapping = mapTaxonomyToPracticeLabels(taxonomyPrefs.map((t) => t.termId));
    practices = practiceMapping.practices;
    refinements = practiceMapping.refinements;

    if (oppPrefs?.types) {
      interests = mapOpportunityTypesToInterestLabels(oppPrefs.types);
    }
  } else {
    const engine = await getEngine();
    const user = engine.store.users.get(session.account.userId!);
    if (user) {
      if (user.taxonomyPreferences) {
        const practiceMapping = mapTaxonomyToPracticeLabels(user.taxonomyPreferences.map((t) => t.termId));
        practices = practiceMapping.practices;
        refinements = practiceMapping.refinements;
      }
      if (user.opportunityPreferences?.types) {
        interests = mapOpportunityTypesToInterestLabels(user.opportunityPreferences.types);
      }
      if (practices.length > 0 || interests.length > 0) {
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
    kind: "resume-save" | "explore-matches" | "prepare-opportunity" | "browse-all";
  };

  if (firstSaveIntent) {
    nextAction = {
      kind: "resume-save",
      label: `Prepare ${firstSaveIntent.context.title}`,
      description: "Review deadline and application details in your private workspace.",
      href: "/workspace",
    };
  } else if (practices.length > 0) {
    nextAction = {
      kind: "explore-matches",
      label: `Explore ${practices.join(" & ")} opportunities`,
      description: "Curated open calls matching your private practice preferences.",
      href: "/workspace",
    };
  } else {
    nextAction = {
      kind: "browse-all",
      label: "Explore all open calls",
      description: "Start exploring upcoming deadlines across disciplines.",
      href: "/workspace",
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
      completedAt,
      skippedAt,
      nextAction,
    },
    { headers: noStore }
  );
}

export async function POST(request: Request) {
  const session = await sessionForRequest();
  if (!session?.account.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401, headers: noStore }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400, headers: noStore }
    );
  }

  const parseResult = creatorOnboardingMutationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid onboarding payload.", issues: parseResult.error.issues },
      { status: 400, headers: noStore }
    );
  }

  const data = parseResult.data;
  const preferenceRepo = getCreatorPreferenceRepository();
  const profileRepo = getCreatorProfileRepository();
  const engine = await getEngine();
  const now = new Date().toISOString();

  if (data.action === "skip") {
    if (preferenceRepo) {
      await preferenceRepo.upsertProductState(session.account.id, {
        onboardingStatus: "skipped",
        skippedAt: now,
        onboardingStep: data.step ?? 0,
        lastRoute: data.lastRoute ?? "/workspace",
      });
    }

    return NextResponse.json(
      {
        success: true,
        status: "skipped",
        redirectUrl: "/workspace",
      },
      { headers: noStore }
    );
  }

  // Handle save_step or complete
  const taxonomyPreferences = mapPracticesToTaxonomy(data.practices, data.refinements);
  const opportunityTypes = mapInterestsToOpportunityTypes(data.interests);

  const isComplete = data.action === "complete";
  const newStatus = isComplete ? "completed" : "in_progress";
  const currentStep = data.step ?? (isComplete ? 2 : 1);

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
      types: opportunityTypes.length > 0 ? opportunityTypes : existingOpportunity.types,
      disciplines: data.practices.length > 0 ? data.practices : existingOpportunity.disciplines,
      genres: data.refinements.length > 0 ? data.refinements : existingOpportunity.genres,
    };

    const idempotencyKey = `onboarding-${session.account.id}-${Date.now()}`;
    const envelope = creatorCommandEnvelope(
      session.account.id,
      "creator-preferences.update",
      idempotencyKey,
      { taxonomyPreferences, opportunityPreferences: updatedOpportunity },
      expectedRevision
    );

    try {
      await preferenceRepo.updatePreferences(envelope, taxonomyPreferences, updatedOpportunity);
    } catch (err) {
      console.warn("Preference update error (continuing with product state):", err);
    }

    await preferenceRepo.upsertProductState(session.account.id, {
      onboardingStatus: newStatus,
      onboardingStep: currentStep,
      completedAt: isComplete ? now : null,
      primaryPractice: data.primaryPractice ?? data.practices[0] ?? null,
      secondaryPractices: data.practices.slice(1),
      lastRoute: data.lastRoute ?? "/workspace",
    });
  }

  // Dual-write to in-memory engine for store consistency
  if (session.account.userId) {
    let user = engine.store.users.get(session.account.userId);
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
          locations: [],
          careerStages: [],
          noFeeOnly: false,
          simultaneousRequired: false,
        },
      };
      engine.store.users.set(session.account.userId, user);
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
      }
    }
    await persistRadar();
  }

  return NextResponse.json(
    {
      success: true,
      status: newStatus,
      step: currentStep,
      redirectUrl: "/workspace",
    },
    { headers: noStore }
  );
}
