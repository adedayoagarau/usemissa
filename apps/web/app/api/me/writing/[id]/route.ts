import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { isWritingEntryId, parseWritingSaveRequest } from "@/lib/writing";
import { getWritingRepository } from "@/lib/writing-repository";
import { parsePieceChange } from "@/lib/writing-projects";
import { PLANNER_LOCKED, plannerIncluded, smallJson } from "../_shared";

const headers = { "Cache-Control": "private, no-store" };
// The longest entry in UTF-8, plus room for the JSON around it.
const MAX_REQUEST_BYTES = 1_700_000;

type Context = { params: Promise<{ id: string }> };

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers });
}

async function prepare(request: Request, context: Context) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return { response: json({ error: "Not authenticated" }, 401) };
  const id = (await context.params).id;
  if (!isWritingEntryId(id))
    return { response: json({ error: "Entry not found." }, 404) };
  const repository = getWritingRepository();
  if (!repository) {
    return {
      response: json(
        {
          error: "Saving to your account is not available here.",
          unavailable: true,
        },
        503,
      ),
    };
  }
  return { accountId: session.account.id, id, repository };
}

export async function GET(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  try {
    const entry = await prepared.repository.get(
      prepared.accountId,
      prepared.id,
    );
    return entry ? json({ entry }) : json({ error: "Entry not found." }, 404);
  } catch {
    return json({ error: "We could not open this entry. Try again." }, 500);
  }
}

/** Saves the entry's full text. Creates it when `baseRevision` is 0. */
export async function PUT(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_REQUEST_BYTES) {
    return json(
      {
        error:
          "This entry is too long to save. Start a new entry to keep writing.",
      },
      413,
    );
  }
  const parsed = parseWritingSaveRequest(
    await request.json().catch(() => undefined),
  );
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  try {
    const result = await prepared.repository.save(
      prepared.accountId,
      prepared.id,
      parsed,
    );
    if (result.kind === "saved") return json({ entry: result.entry });
    if (result.kind === "conflict") {
      return json(
        {
          error: "This entry changed on another device.",
          current: result.current,
        },
        409,
      );
    }
    return json({ error: "Entry not found." }, 404);
  } catch {
    return json(
      {
        error:
          "We could not save this entry. Your text is still on this device. Try again.",
      },
      500,
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  try {
    const deleted = await prepared.repository.delete(
      prepared.accountId,
      prepared.id,
    );
    return deleted
      ? json({ deleted: true })
      : json({ error: "Entry not found." }, 404);
  } catch {
    return json(
      { error: "We could not delete this entry. It is unchanged. Try again." },
      500,
    );
  }
}

/** Moves a piece between projects or changes its index card. Its text is untouched. */
export async function PATCH(request: Request, context: Context) {
  const prepared = await prepare(request, context);
  if ("response" in prepared) return prepared.response;
  const parsed = parsePieceChange(await smallJson(request));
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  // The planner's cards are part of Plus; synopsis and status stay free.
  if (parsed.card !== undefined && !(await plannerIncluded(prepared.accountId)))
    return json(PLANNER_LOCKED, 403);
  try {
    const result = await prepared.repository.changePiece(
      prepared.accountId,
      prepared.id,
      parsed,
    );
    if (result === "no-project")
      return json({ error: "Project not found." }, 404);
    return result
      ? json({ entry: result })
      : json({ error: "Entry not found." }, 404);
  } catch {
    return json({ error: "We could not change this piece. Try again." }, 500);
  }
}
