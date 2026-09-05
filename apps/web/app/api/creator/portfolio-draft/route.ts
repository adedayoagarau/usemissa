import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getCreatorProfileRepository();
  if (!repo) {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  try {
    const draft = await repo.getPortfolioDraft(session.account.id);
    return NextResponse.json({ draft: draft ?? null });
  } catch (error) {
    console.error("Failed to load portfolio draft:", error);
    return NextResponse.json(
      { error: "Failed to load draft" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSessionAccountFromToken(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getCreatorProfileRepository();
  if (!repo) {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await repo.savePortfolioDraft(session.account.id, body.draft);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save portfolio draft:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 },
    );
  }
}
