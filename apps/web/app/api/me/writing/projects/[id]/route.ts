import { isWritingProjectId, parseProjectTitle } from "@/lib/writing-projects";
import { parseProjectPlan } from "@/lib/writing-cards";
import {
  json,
  PLANNER_LOCKED,
  plannerIncluded,
  smallJson,
  writingSession,
} from "../../_shared";

type Context = { params: Promise<{ id: string }> };

/** Renames a project, or replaces its plan (its plotlines, part of Plus). */
export async function PATCH(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const body = await smallJson(request);
  const planned =
    body && typeof body === "object" ? Reflect.get(body, "plan") : undefined;
  if (planned !== undefined) {
    const plan = parseProjectPlan(planned);
    if ("error" in plan) return json({ error: plan.error }, 400);
    if (!(await plannerIncluded(prepared.accountId)))
      return json(PLANNER_LOCKED, 403);
    try {
      const project = await prepared.repository.setProjectPlan(
        prepared.accountId,
        id,
        plan,
      );
      return project
        ? json({ project })
        : json({ error: "Project not found." }, 404);
    } catch {
      return json(
        { error: "We could not save the plotlines. Try again." },
        500,
      );
    }
  }
  const parsed = parseProjectTitle(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const project = await prepared.repository.renameProject(
      prepared.accountId,
      id,
      parsed.title,
    );
    return project
      ? json({ project })
      : json({ error: "Project not found." }, 404);
  } catch {
    return json({ error: "We could not rename this project. Try again." }, 500);
  }
}

/** Deletes a project. Its pieces stay in the account as loose pieces. */
export async function DELETE(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  try {
    const deleted = await prepared.repository.deleteProject(
      prepared.accountId,
      id,
    );
    return deleted
      ? json({ deleted: true })
      : json({ error: "Project not found." }, 404);
  } catch {
    return json(
      {
        error: "We could not delete this project. It is unchanged. Try again.",
      },
      500,
    );
  }
}
