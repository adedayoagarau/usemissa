import { CreatorConflictError, deleteObligation, listObligations, updateObligation } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import {
  idempotencyKeyFrom,
  ifMatchRevision,
  obligationError,
  obligationUpdateSchema,
  planningJson,
  planningPoolOrNull,
} from "@/lib/obligation-routes";
import { mirrorCalendarProviderAfterEdit } from "@/lib/calendar-provider-mirror";

async function currentStep(accountId: string, id: string, error: unknown) {
  const pool = planningPoolOrNull();
  if (!pool || !(error instanceof CreatorConflictError)) return undefined;
  return (await listObligations(pool, accountId).catch(() => [])).find((step) => step.id === id);
}

/** Edit a step: label, date or offset, buffer policy, effort, or open/done/skipped. Needs If-Match. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to change your plan." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Your plan is unavailable right now." }, 503);
  const revision = ifMatchRevision(request);
  if (revision === null) return planningJson({ error: "Refresh this step before changing it." }, 400);
  const key = idempotencyKeyFrom(request);
  if ("error" in key) return planningJson({ error: key.error }, 400);
  const parsed = obligationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return planningJson({ error: parsed.error.issues[0]?.message ?? "Check the step details." }, 400);
  const { id } = await params;
  try {
    const result = await updateObligation(pool, session.account.id, id, parsed.data, { expectedRevision: revision, idempotencyKey: key.key });
    if (!result.replayed) await mirrorCalendarProviderAfterEdit(session.account.id);
    return planningJson(result);
  } catch (error) {
    return obligationError(error, "The step could not be changed. Try again.", await currentStep(session.account.id, id, error));
  }
}

/** Remove a step from the plan. Needs If-Match. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return planningJson({ error: "Sign in to change your plan." }, 401);
  const pool = planningPoolOrNull();
  if (!pool) return planningJson({ error: "Your plan is unavailable right now." }, 503);
  const revision = ifMatchRevision(request);
  if (revision === null) return planningJson({ error: "Refresh this step before removing it." }, 400);
  const key = idempotencyKeyFrom(request);
  if ("error" in key) return planningJson({ error: key.error }, 400);
  const { id } = await params;
  try {
    const result = await deleteObligation(pool, session.account.id, id, { expectedRevision: revision, idempotencyKey: key.key });
    if (!result.replayed) await mirrorCalendarProviderAfterEdit(session.account.id);
    return planningJson(result);
  } catch (error) {
    return obligationError(error, "The step could not be removed. Try again.", await currentStep(session.account.id, id, error));
  }
}
