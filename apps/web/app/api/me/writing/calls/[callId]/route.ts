import { getSessionAccount } from "@/lib/auth";
import { ApplicationWorkspaceRepository } from "@/lib/application-workspace";
import { PreSubmitRepository } from "@/lib/pre-submit-repository";
import { isCallId } from "@/lib/writing-projects";
import { json } from "../../_shared";

type Context = { params: Promise<{ callId: string }> };

/**
 * A tracked call's details and its pre-submit inputs, for writing a piece
 * against it. Nothing about the piece is sent here: the checks run in the
 * browser on the piece's own text.
 */
export async function GET(request: Request, context: Context) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Not authenticated" }, 401);
  const callId = (await context.params).callId;
  if (!isCallId(callId)) return json({ error: "Call not found." }, 404);
  if (!process.env.DATABASE_URL)
    return json(
      { error: "Calls aren't available here.", unavailable: true },
      503,
    );
  try {
    const [detail, input] = await Promise.all([
      new ApplicationWorkspaceRepository().detail(session.account.id, callId),
      new PreSubmitRepository().input(session.account.id, callId),
    ]);
    if (!detail || !input)
      return json({ error: "This call isn't in your tracker anymore." }, 404);
    return json({
      call: {
        opportunityId: detail.opportunityId,
        title: detail.title,
        organizationName: detail.organizationName,
        deadline: detail.deadline,
        deadlineKind: detail.deadlineKind,
        guidelinesUrl: detail.guidelinesUrl ?? null,
        applyUrl: detail.applyUrl ?? null,
      },
      input: {
        requirements: input.requirements,
        wordLimit: input.wordLimit,
        pageLimit: input.pageLimit,
        blindReview: input.blindReview,
        names: input.names,
        materials: [],
      },
    });
  } catch {
    return json({ error: "This call didn't load. Try again." }, 503);
  }
}
