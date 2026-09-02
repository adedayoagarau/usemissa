import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";
import { getCreatorAccountRepository } from "@/lib/creatorRepositories";
import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platformAnalytics";
import { clientAddress, consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { email, password } = (
    body && typeof body === "object" ? body : {}
  ) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!email.trim() || email.length > 320 || password.length > 200) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const retryAfter = await consumeAuthRateLimit({
    ip: clientAddress(request),
    email,
  });
  if (retryAfter !== undefined) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  let account;
  try {
    const repository = getCreatorAccountRepository();
    account = repository
      ? await repository.authenticatePassword(email, password)
      : (await getEngine()).logIn(email, password);
    if (!account) throw new Error("invalid credentials");
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = issueSessionToken(account.id);
  await trackPlatformAnalytics({
    eventName: "auth.login_succeeded",
    source: "auth-api",
    accountId: account.id,
    properties: { method: "password" },
  });
  const response = NextResponse.json(
    { account: { id: account.id, email: account.email } },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
