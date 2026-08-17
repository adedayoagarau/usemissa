import { NextResponse } from "next/server";
import {
  claimUserHandle,
  HANDLE_CLAIM_WINDOW_MESSAGE,
  HANDLE_RENAME_TOO_SOON_MESSAGE,
  HANDLE_UNAVAILABLE_MESSAGE,
  PUBLICATION_CLAIM_HOLD_MESSAGE,
  handleNamespaceAvailable,
  readUserHandle,
  renameUserHandle,
} from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";

const headers = { "Cache-Control": "private, no-store" };
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return json({ error: "Not authenticated" }, 401);
  if (!process.env.DATABASE_URL)
    return json({ error: "Handle claiming is not available here." }, 503);
  const available = await handleNamespaceAvailable(process.env.DATABASE_URL);
  if (!available)
    return json({ error: "Handle claiming is not available here." }, 503);
  const handle = await readUserHandle(
    process.env.DATABASE_URL,
    session.account.userId,
  );
  return json({ handle });
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return json({ error: "Not authenticated" }, 401);
  if (!process.env.DATABASE_URL)
    return json({ error: "Handle claiming is not available here." }, 503);
  const body = await request.json().catch(() => null);
  const requestedHandle =
    body &&
    typeof body === "object" &&
    "handle" in body &&
    typeof body.handle === "string"
      ? body.handle
      : "";
  const result = await claimUserHandle({
    connectionString: process.env.DATABASE_URL,
    accountId: session.account.id,
    userId: session.account.userId,
    requestedHandle,
  });
  if (result.state === "claimed") return json(result, 201);
  if (result.state === "already-claimed") return json(result);
  if (result.state === "invalid")
    return json(
      { error: "Choose a handle with 3–30 letters, numbers, or hyphens." },
      400,
    );
  if (result.state === "claim-window-closed")
    return json({ error: HANDLE_CLAIM_WINDOW_MESSAGE }, 403);
  if (result.state === "publication-claim")
    return json(
      { state: result.state, error: PUBLICATION_CLAIM_HOLD_MESSAGE },
      409,
    );
  if (result.state === "namespace-unavailable")
    return json({ error: "Handle claiming is not available here." }, 503);
  return json({ error: HANDLE_UNAVAILABLE_MESSAGE }, 409);
}

export async function PATCH(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return json({ error: "Not authenticated" }, 401);
  if (!process.env.DATABASE_URL)
    return json({ error: "Handle claiming is not available here." }, 503);
  const body = await request.json().catch(() => null);
  const requestedHandle =
    body &&
    typeof body === "object" &&
    "handle" in body &&
    typeof body.handle === "string"
      ? body.handle
      : "";
  const result = await renameUserHandle({
    connectionString: process.env.DATABASE_URL,
    accountId: session.account.id,
    userId: session.account.userId,
    requestedHandle,
  });
  if (result.state === "renamed") return json(result);
  if (result.state === "invalid")
    return json(
      { error: "Choose a handle with 3–30 letters, numbers, or hyphens." },
      400,
    );
  if (result.state === "not-found")
    return json({ error: "Claim a handle before renaming it." }, 409);
  if (result.state === "rename-too-soon")
    return json(
      { error: HANDLE_RENAME_TOO_SOON_MESSAGE, retryAt: result.retryAt },
      429,
    );
  if (result.state === "publication-claim")
    return json(
      { state: result.state, error: PUBLICATION_CLAIM_HOLD_MESSAGE },
      409,
    );
  if (result.state === "namespace-unavailable")
    return json({ error: "Handle claiming is not available here." }, 503);
  return json({ error: HANDLE_UNAVAILABLE_MESSAGE }, 409);
}
