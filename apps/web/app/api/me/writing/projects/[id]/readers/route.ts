import { z } from "zod";
import { isWritingProjectId } from "@/lib/writing-projects";
import { boundedWritingJson } from "@/lib/writing-studio-data";
import { json, writingSession } from "../../../_shared";

type Context = { params: Promise<{ id: string }> };
const createSchema = z.object({ checkpointId: z.string().uuid() }).strict();
const revokeSchema = z.object({ id: z.string().uuid() }).strict();

export async function GET(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const { id } = await context.params;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  try {
    const shareId = new URL(request.url).searchParams.get("shareId");
    if (shareId !== null) {
      if (!z.string().uuid().safeParse(shareId).success)
        return json({ error: "Reader link not found." }, 404);
      const feedback = await prepared.repository.getReaderFeedback(
        prepared.accountId,
        id,
        shareId,
      );
      return feedback
        ? json(feedback)
        : json({ error: "Reader link not found." }, 404);
    }
    const shares = await prepared.repository.listReaderShares(
      prepared.accountId,
      id,
    );
    return shares
      ? json({ shares })
      : json({ error: "Project not found." }, 404);
  } catch {
    return json({ error: "We could not load reader links. Try again." }, 500);
  }
}

export async function POST(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const { id } = await context.params;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const parsed = createSchema.safeParse(
    await boundedWritingJson(request, 2_000),
  );
  if (!parsed.success)
    return json({ error: "Choose a saved checkpoint to share." }, 400);
  try {
    const result = await prepared.repository.createReaderShare(
      prepared.accountId,
      id,
      parsed.data.checkpointId,
    );
    if (result.kind === "created") return json({ share: result.share }, 201);
    if (result.kind === "limit")
      return json(
        {
          error:
            "This project already has 20 active reader links. Revoke a link before adding another.",
        },
        429,
      );
    return json(
      {
        error:
          "Project or checkpoint not found. Save the checkpoint before sharing.",
      },
      404,
    );
  } catch {
    return json(
      { error: "We could not create the reader link. Try again." },
      500,
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const { id } = await context.params;
  if (!isWritingProjectId(id))
    return json({ error: "Project not found." }, 404);
  const parsed = revokeSchema.safeParse(
    await boundedWritingJson(request, 2_000),
  );
  if (!parsed.success)
    return json({ error: "Choose a reader link to revoke." }, 400);
  try {
    const revoked = await prepared.repository.revokeReaderShare(
      prepared.accountId,
      id,
      parsed.data.id,
    );
    return revoked
      ? json({ revoked: true })
      : json({ error: "Reader link not found." }, 404);
  } catch {
    return json(
      { error: "We could not revoke this reader link. Try again." },
      500,
    );
  }
}
