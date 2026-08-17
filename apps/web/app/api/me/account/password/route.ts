import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@missa/radar-engine";

import {
  getSessionAccount,
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";
import { getNeonAuth } from "@/lib/neon-auth/server";

const headers = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers },
    );
  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (
    typeof body.currentPassword !== "string" ||
    typeof body.newPassword !== "string"
  )
    return NextResponse.json(
      { error: "Enter your current and new password." },
      { status: 400, headers },
    );
  if (body.newPassword.length < 8 || body.newPassword.length > 200)
    return NextResponse.json(
      { error: "Use a new password between 8 and 200 characters." },
      { status: 400, headers },
    );
  if (body.currentPassword === body.newPassword)
    return NextResponse.json(
      { error: "Choose a different new password." },
      { status: 400, headers },
    );

  const engine = await getEngine();
  const account = engine.store.accounts.get(session.account.id);
  if (!account)
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404, headers },
    );

  if (session.account.authProvider === "neon-auth") {
    const auth = getNeonAuth();
    if (!auth)
      return NextResponse.json(
        { error: "Password changes are temporarily unavailable." },
        { status: 503, headers },
      );
    const result = await auth.changePassword({
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      revokeOtherSessions: true,
    });
    if (result.error)
      return NextResponse.json(
        { error: "The current password is not correct." },
        { status: 403, headers },
      );
  } else {
    if (!verifyPassword(body.currentPassword, session.account.passwordHash))
      return NextResponse.json(
        { error: "The current password is not correct." },
        { status: 403, headers },
      );
    account.passwordHash = hashPassword(body.newPassword);
  }
  account.sessionVersion = (account.sessionVersion ?? 0) + 1;
  engine.recordAudit(
    account.id,
    "account.password_changed",
    "account",
    account.id,
    JSON.stringify({ field: "password" }),
  );
  await persistRadar();
  const response = NextResponse.json({ changed: true }, { headers });
  response.cookies.set(
    SESSION_COOKIE,
    issueSessionToken(account.id, account.sessionVersion),
    sessionCookieOptions(),
  );
  return response;
}
