import { NextResponse } from "next/server";
import { getSessionAccount, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { getCreatorAccountRepository } from "@/lib/creatorRepositories";
import { getNeonAuth } from "@/lib/neon-auth/server";

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== "CLOSE MY ACCOUNT") {
    return NextResponse.json({ error: "Type CLOSE MY ACCOUNT to confirm." }, { status: 400 });
  }
  const repository = getCreatorAccountRepository();
  if (!repository) return NextResponse.json({ error: "Account closure is unavailable." }, { status: 503 });
  try {
    const closed = await repository.closeAccount(session.account.id);
    if (!closed) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    await getNeonAuth()?.signOut().catch(() => undefined);
    const response = NextResponse.json({ closed: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return response;
  } catch {
    return NextResponse.json({ error: "We could not close your account. Please try again." }, { status: 503 });
  }
}
