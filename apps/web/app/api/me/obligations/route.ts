import {
  applyTemplatesForTracked,
  createObligation,
  getPlanningPreferences,
  listObligations,
  planningItemFor,
  type CreatorObligationState,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { creatorToday } from "@/lib/deadline-planning";
import {
  idempotencyKeyFrom,
  obligationCreateSchema,
  obligationError,
  planningJson,
  planningPoolOrNull,
} from "@/lib/obligation-routes";
import { templateInputs } from "@/lib/planning-engine";
import { mirrorCalendarProviderAfterEdit } from "@/lib/calendar-provider-mirror";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATES = new Set<CreatorObligationState>(["open", "done", "skipped"]);

/** The creator's plan steps, soonest first, filtered by date range, application or state. */
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to see your plan." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Your plan is unavailable right now." }, 503);
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to)))
    return planningJson({ error: "Choose valid dates." }, 400);
  const states = params.getAll("state").filter((state): state is CreatorObligationState => STATES.has(state as CreatorObligationState));
  try {
    const obligations = await listObligations(pool, session.account.id, {
      from,
      to,
      trackedOpportunityId: params.get("trackedId") ?? undefined,
      opportunityId: params.get("opportunityId") ?? params.get("application") ?? undefined,
      ...(states.length ? { states } : {}),
    });
    return planningJson({ obligations });
  } catch {
    return planningJson({ error: "Your plan could not load. Try again." }, 503);
  }
}

/**
 * Add one step, or a template set: { templates: "preparation" } anchors the
 * steps to the confirmed deadline, { templates: "acceptance" } to today.
 * Template sets are idempotent; single steps replay with the Idempotency-Key.
 */
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to plan this application." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Your plan is unavailable right now." }, 503);
  const parsed = obligationCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return planningJson({ error: parsed.error.issues[0]?.message ?? "Check the step details." }, 400);
  const body = parsed.data;
  const accountId = session.account.id;
  try {
    if ("templates" in body) {
      const item = await planningItemFor(pool, accountId, { trackedOpportunityId: body.trackedId, opportunityId: body.opportunityId });
      if (!item) return planningJson({ error: "Save this opportunity to your Tracker before planning it." }, 404);
      const preferences = await getPlanningPreferences(pool, accountId);
      const today = await creatorToday(accountId);
      const result = await applyTemplatesForTracked(
        pool,
        accountId,
        { trackedOpportunityId: item.trackedOpportunityId },
        templateInputs(body.templates, item.type, preferences),
        body.templates === "acceptance" ? "today" : "deadline",
        { today },
      );
      if (result.skipped === "no-deadline")
        return planningJson({ error: "This call has no confirmed deadline yet. Add steps with your own dates instead." }, 400);
      if (result.created.length) await mirrorCalendarProviderAfterEdit(accountId);
      return planningJson(result, result.created.length ? 201 : 200);
    }
    const key = idempotencyKeyFrom(request);
    if ("error" in key) return planningJson({ error: key.error }, 400);
    const { trackedId, ...input } = body;
    const result = await createObligation(pool, accountId, { ...input, trackedOpportunityId: trackedId }, { idempotencyKey: key.key });
    if (!result.replayed) await mirrorCalendarProviderAfterEdit(accountId);
    return planningJson(result, result.replayed ? 200 : 201);
  } catch (error) {
    return obligationError(error, "The step could not be saved. Try again.");
  }
}
