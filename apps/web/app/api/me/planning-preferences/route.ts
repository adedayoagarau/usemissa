import {
  creatorFeatures,
  creatorPlan,
  getPlanningPreferences,
  PlanningPreferencesConflictError,
  PlanningPreferencesUnavailableError,
  putPlanningPreferences,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { parsePlanningPreferences, planningJson, planningPoolOrNull } from "@/lib/obligation-routes";

/** Planning preferences with the features the plan includes, so surfaces can show what is available. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to see your planning settings." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Planning settings are unavailable right now." }, 503);
  try {
    const [preferences, plan] = await Promise.all([
      getPlanningPreferences(pool, session.account.id),
      creatorPlan(pool, session.account.id),
    ]);
    return planningJson({ preferences, features: creatorFeatures(plan) });
  } catch {
    return planningJson({ error: "Planning settings could not load. Try again." }, 503);
  }
}

/**
 * Save planning preferences against the revision the client loaded (0 when
 * none were saved). A stale revision returns 409 with the current values so
 * the client can show them instead of overwriting another device's change.
 */
export async function PUT(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to change your planning settings." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Planning settings are unavailable right now." }, 503);
  const parsed = parsePlanningPreferences(await request.json().catch(() => null));
  if (!parsed.ok) return planningJson({ error: parsed.error }, 400);
  try {
    const preferences = await putPlanningPreferences(pool, session.account.id, parsed.input, parsed.expectedRevision);
    return planningJson({ preferences });
  } catch (error) {
    if (error instanceof PlanningPreferencesConflictError)
      return planningJson(
        { error: "These settings changed on another device. Review them and save again.", current: error.current },
        409,
      );
    if (error instanceof PlanningPreferencesUnavailableError)
      return planningJson({ error: "Planning settings are not available yet." }, 503);
    return planningJson({ error: "Planning settings could not be saved. Try again." }, 503);
  }
}
