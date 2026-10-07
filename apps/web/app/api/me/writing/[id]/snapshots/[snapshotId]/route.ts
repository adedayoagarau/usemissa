import { isWritingEntryId } from "@/lib/writing";
import { isWritingSnapshotId } from "@/lib/writing-snapshots";
import { json, writingSession } from "../../../_shared";

type Context = { params: Promise<{ id: string; snapshotId: string }> };

async function prepare(request: Request, context: Context) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared;
  const { id, snapshotId } = await context.params;
  if (!isWritingEntryId(id) || !isWritingSnapshotId(snapshotId)) {
    return { response: json({ error: "Snapshot not found." }, 404) };
  }
  return { ...prepared, id, snapshotId };
}

/** One snapshot with its text, to compare or restore. */
export async function GET(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  try {
    const snapshot = await prepared.repository.getSnapshot(
      prepared.accountId,
      prepared.id,
      prepared.snapshotId,
    );
    return snapshot
      ? json({ snapshot })
      : json({ error: "Snapshot not found." }, 404);
  } catch {
    return json({ error: "We could not open this snapshot. Try again." }, 500);
  }
}

export async function DELETE(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  try {
    const deleted = await prepared.repository.deleteSnapshot(
      prepared.accountId,
      prepared.id,
      prepared.snapshotId,
    );
    return deleted
      ? json({ deleted: true })
      : json({ error: "Snapshot not found." }, 404);
  } catch {
    return json(
      { error: "We could not delete this snapshot. Try again." },
      500,
    );
  }
}
