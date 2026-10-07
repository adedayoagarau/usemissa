import { isWritingEntryId } from "@/lib/writing";
import { parseSnapshotRequest } from "@/lib/writing-snapshots";
import { json, writingSession } from "../../_shared";

type Context = { params: Promise<{ id: string }> };
// The longest piece in UTF-8, plus room for the JSON around it.
const MAX_REQUEST_BYTES = 1_700_000;

/** A piece's snapshots, newest first, without their text. */
export async function GET(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingEntryId(id)) return json({ error: "Entry not found." }, 404);
  try {
    return json({
      snapshots: await prepared.repository.listSnapshots(
        prepared.accountId,
        id,
      ),
    });
  } catch {
    return json({ error: "We could not load the snapshots. Try again." }, 500);
  }
}

/** Keeps a copy of the piece as it stands now. Safe to retry with the same id. */
export async function POST(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const id = (await context.params).id;
  if (!isWritingEntryId(id)) return json({ error: "Entry not found." }, 404);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return json(
      { error: "This piece is too long to keep as a snapshot." },
      413,
    );
  }
  const parsed = parseSnapshotRequest(
    await request.json().catch(() => undefined),
  );
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const snapshot = await prepared.repository.createSnapshot(
      prepared.accountId,
      id,
      parsed,
    );
    return snapshot
      ? json({ snapshot }, 201)
      : json(
          {
            error:
              "This piece isn't saved to your account yet. Write a little, then try again.",
          },
          404,
        );
  } catch {
    return json({ error: "We could not keep this snapshot. Try again." }, 500);
  }
}
