import { isWritingProjectId, parseProjectTitle } from "@/lib/writing-projects";
import { json, smallJson, writingSession } from "../../_shared";

type Context = { params: Promise<{ id: string }> };

/** Renames a project. */
export async function PATCH(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const parsed = parseProjectTitle(await smallJson(request));
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
