import {
  parseProjectBackup,
  PROJECT_RESTORE_BYTES_MAX,
} from "@/lib/writing-project-backup";
import { boundedWritingJson } from "@/lib/writing-studio-data";
import { json, writingSession } from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Restore into fresh identifiers; all account writes commit or roll back together. */
export async function POST(request: Request) {
  const prepared = await writingSession(request);
  if ("response" in prepared) return prepared.response;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        return json({ error: "Open Missa before restoring a project." }, 403);
    } catch {
      return json({ error: "Open Missa before restoring a project." }, 403);
    }
  }
  const input = await boundedWritingJson(request, PROJECT_RESTORE_BYTES_MAX);
  let backup;
  try {
    backup = parseProjectBackup(JSON.stringify(input));
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "This project backup could not be read.",
      },
      400,
    );
  }
  try {
    const result = await prepared.repository.restoreProjectBackup(
      prepared.accountId,
      backup,
    );
    if (result.kind === "taken")
      return json(
        {
          error:
            "These restored IDs are already in use. Choose the backup again to make a separate copy.",
        },
        409,
      );
    if (result.kind === "limit")
      return json(
        {
          error:
            "This restore would exceed the account limit of 200 projects or 500 visible pieces. Keep the backup and make space before restoring.",
        },
        409,
      );
    if (!("project" in result)) return json({ error: "This project could not be restored." }, 409);
    return json(
      {
        project: result.project,
        entries: result.entries,
        replayed: result.kind === "exists",
      },
      result.kind === "restored" ? 201 : 200,
    );
  } catch {
    return json(
      {
        error:
          "The project could not be restored. Keep the backup and retry; existing projects were not changed.",
      },
      500,
    );
  }
}
