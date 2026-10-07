import { isWritingProjectId } from "@/lib/writing-projects";
import { json, writingSession } from "../../../_shared";

type Context = { params: Promise<{ id: string }> };

/** A project's pieces in order with their full text, for compiling into one manuscript. */
export async function GET(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  try {
    const compiled = await prepared.repository.compile(prepared.accountId, id);
    return compiled
      ? json(compiled)
      : json({ error: "Project not found." }, 404);
  } catch {
    return json({ error: "We could not gather this project. Try again." }, 500);
  }
}
