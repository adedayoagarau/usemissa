import { creatorFeatures, creatorPlan, getPlanningPreferences, listPlanningItems } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { creatorToday } from "@/lib/deadline-planning";
import { planningJson, planningPoolOrNull } from "@/lib/obligation-routes";
import { capacityReport } from "@/lib/planning-engine";

/**
 * Capacity across every call in preparation: hours left on open steps
 * against the creator's weekly hours, up to each personal target or
 * deadline, with a start-by date per call. Included with Pro; other plans
 * get { status: "locked" } so the surface can explain what Pro adds.
 */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to see your capacity." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Capacity planning is unavailable right now." }, 503);
  try {
    const accountId = session.account.id;
    const features = creatorFeatures(await creatorPlan(pool, accountId));
    if (!features.capacityPlanning) return planningJson({ status: "locked", feature: "capacityPlanning" });
    const [preferences, items, today] = await Promise.all([
      getPlanningPreferences(pool, accountId),
      listPlanningItems(pool, accountId),
      creatorToday(accountId),
    ]);
    return planningJson(capacityReport({ features, preferences, items, today }));
  } catch {
    return planningJson({ error: "Capacity could not load. Try again." }, 503);
  }
}
