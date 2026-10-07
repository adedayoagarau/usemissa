import { isWritingProjectId, parsePieceOrder } from "@/lib/writing-projects";
import { json, smallJson, writingSession } from "../../../_shared";

type Context = { params: Promise<{ id: string }> };

/** Sets the order of a project's pieces, moving any named piece into it. */
export async function PUT(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const parsed = parsePieceOrder(await smallJson(request));
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const ordered = await prepared.repository.orderPieces(
      prepared.accountId,
      id,
      parsed.entryIds,
    );
    return ordered
      ? json({ ordered: true })
      : json({ error: "Project not found." }, 404);
  } catch {
    return json({ error: "We could not save the new order. Try again." }, 500);
  }
}
