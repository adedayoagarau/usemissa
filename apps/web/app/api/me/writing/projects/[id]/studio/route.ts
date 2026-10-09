import { isWritingProjectId } from "@/lib/writing-projects";
import {
  boundedWritingJson,
  STUDIO_BYTES_MAX,
  studioSaveSchema,
} from "@/lib/writing-studio-data";
import {
  json,
  PLANNER_LOCKED,
  plannerIncluded,
  writingSession,
} from "../../../_shared";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const { id } = await context.params;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  try {
    const studio = await prepared.repository.getStudio(prepared.accountId, id);
    return studio
      ? json({ studio })
      : json({ error: "Project not found." }, 404);
  } catch {
    return json(
      { error: "We could not load your project studio. Try again." },
      500,
    );
  }
}

export async function PUT(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const { id } = await context.params;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const parsed = studioSaveSchema.safeParse(
    await boundedWritingJson(request, STUDIO_BYTES_MAX),
  );
  if (!parsed.success)
    return json(
      { error: "Check the project studio data and its size before saving." },
      400,
    );
  try {
    const saved = await prepared.repository.saveStudio(
      prepared.accountId,
      id,
      parsed.data,
      await plannerIncluded(prepared.accountId),
    );
    if (saved.kind === "saved") return json({ studio: saved.studio });
    if (saved.kind === "conflict")
      return json(
        {
          error:
            "This studio changed elsewhere. Keep both copies before saving again.",
          current: saved.current,
        },
        409,
      );
    if (saved.kind === "locked") return json(PLANNER_LOCKED, 403);
    return json({ error: "Project not found." }, 404);
  } catch {
    return json(
      { error: "We could not save your project studio. Try again." },
      500,
    );
  }
}
