import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { getCreatorCalendarRepository } from "@/lib/creatorRepositories";
import {
  createGoal,
  editGoal,
  goalInput,
  listGoals,
  searchGoalTargets,
  changeGoal,
  goalRecommendations,
  goalDisciplines,
  moveGoalDate,
} from "@/lib/goal-engine";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Sign in to use Goals." }, 401);
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("disciplines"))
      return json({ disciplines: await goalDisciplines() });
    const kind = params.get("kind");
    if (kind && !["organization", "opportunity", "program"].includes(kind))
      return json({ error: "Choose a target type." }, 400);
    const discipline = params.get("discipline") || null;
    if (discipline && !/^[a-z0-9-]{1,80}$/.test(discipline))
      return json({ error: "Choose a discipline." }, 400);
    const recommendationGoal = params.get("recommendations");
    if (recommendationGoal)
      return json({
        items: await goalRecommendations(
          session.account.id,
          recommendationGoal,
        ),
      });
    const search = params.get("search");
    return json(
      search !== null
        ? {
            targets:
              search.trim().length >= 2 || kind !== null
                ? await searchGoalTargets(
                    search.trim().slice(0, 100),
                    kind as
                      "organization" | "opportunity" | "program" | undefined,
                    discipline,
                    params.getAll("type").slice(0, 16),
                  )
                : [],
          }
        : { goals: await listGoals(session.account.id) },
    );
  } catch {
    return json(
      { error: "Goal storage is unavailable. Please try again." },
      503,
    );
  }
}
export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Sign in to use Goals." }, 401);
  const parsed = goalInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return json({ error: "Check your goal, dates and target." }, 400);
  try {
    return json({ id: await createGoal(session.account.id, parsed.data) }, 201);
  } catch {
    return json(
      {
        error: "Could not save this goal. Refresh your targets and try again.",
      },
      503,
    );
  }
}
export async function PATCH(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return json({ error: "Sign in to use Goals." }, 401);
  const b = await request.json().catch(() => null);
  if (
    b?.action === "move-date" &&
    typeof b.id === "string" &&
    Number.isInteger(b.revision) &&
    typeof b.endsOn === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.endsOn) &&
    typeof b.requestId === "string"
  ) {
    try {
      const receipt = await moveGoalDate(session.account.id, b.id, b.revision, b.endsOn, b.requestId);
      const calendar = getCreatorCalendarRepository();
      if (!calendar) return json({ error: "Goal moved, but Calendar could not be updated. Refresh and retry." }, 503);
      await calendar.ensureGoalDate(session.account.id, b.id);
      return json({ id: b.id, receipt });
    } catch {
      return json({ error: "The goal changed somewhere else. Refresh and try again." }, 409);
    }
  }
  if (b?.action === "edit") {
    const parsed = goalInput.safeParse(b);
    if (
      !parsed.success ||
      typeof b.id !== "string" ||
      !Number.isInteger(b.revision) ||
      b.revision < 1
    )
      return json({ error: "Check your goal, dates and target." }, 400);
    try {
      const receipt = await editGoal(
        session.account.id,
        b.id,
        b.revision,
        parsed.data,
      );
      return json({ id: b.id, receipt });
    } catch {
      return json(
        {
          error:
            "Could not save your changes. Retry, or reopen the goal if it changed elsewhere.",
        },
        409,
      );
    }
  }

  if (
    !b ||
    typeof b.id !== "string" ||
    !Number.isInteger(b.revision) ||
    !["pause", "resume", "check-in"].includes(b.action) ||
    (b.action === "check-in" &&
      (typeof b.nextStep !== "string" ||
        !b.nextStep.trim() ||
        b.nextStep.length > 500))
  )
    return json({ error: "Invalid goal update." }, 400);
  try {
    await changeGoal(
      session.account.id,
      b.id,
      b.revision,
      b.action,
      b.nextStep?.trim(),
    );
    return json({ ok: true });
  } catch {
    return json(
      { error: "Goal changed or could not be saved. Refresh and try again." },
      409,
    );
  }
}
