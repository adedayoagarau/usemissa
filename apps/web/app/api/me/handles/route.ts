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

export async function GET(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
  const available = await handleNamespaceAvailable(process.env.DATABASE_URL);
  if (!available)
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
  const handle = await readUserHandle(
    process.env.DATABASE_URL,
    session.account.userId,
  );
  return NextResponse.json({ handle });
}

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
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
  if (result.state === "claimed")
    return NextResponse.json(result, { status: 201 });
  if (result.state === "already-claimed")
    return NextResponse.json(result, { status: 200 });
  if (result.state === "invalid")
    return NextResponse.json(
      { error: "Choose a handle with 3–30 letters, numbers, or hyphens." },
      { status: 400 },
    );
  if (result.state === "claim-window-closed")
    return NextResponse.json(
      { error: HANDLE_CLAIM_WINDOW_MESSAGE },
      { status: 403 },
    );
  if (result.state === "publication-claim")
    return NextResponse.json(
      { state: result.state, error: PUBLICATION_CLAIM_HOLD_MESSAGE },
      { status: 409 },
    );
  if (result.state === "namespace-unavailable")
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
  return NextResponse.json(
    { error: HANDLE_UNAVAILABLE_MESSAGE },
    { status: 409 },
  );
}

export async function PATCH(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session?.account.userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
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
  if (result.state === "renamed") return NextResponse.json(result);
  if (result.state === "invalid")
    return NextResponse.json(
      { error: "Choose a handle with 3–30 letters, numbers, or hyphens." },
      { status: 400 },
    );
  if (result.state === "not-found")
    return NextResponse.json(
      { error: "Claim a handle before renaming it." },
      { status: 409 },
    );
  if (result.state === "rename-too-soon")
    return NextResponse.json(
      { error: HANDLE_RENAME_TOO_SOON_MESSAGE, retryAt: result.retryAt },
      { status: 429 },
    );
  if (result.state === "publication-claim")
    return NextResponse.json(
      { state: result.state, error: PUBLICATION_CLAIM_HOLD_MESSAGE },
      { status: 409 },
    );
  if (result.state === "namespace-unavailable")
    return NextResponse.json(
      { error: "Handle claiming is not available here." },
      { status: 503 },
    );
  return NextResponse.json(
    { error: HANDLE_UNAVAILABLE_MESSAGE },
    { status: 409 },
  );
}
