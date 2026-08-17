import { NextResponse } from "next/server";
import { AuthError } from "@missa/radar-engine";
import { redeemWaitlistInvite } from "@missa/radar-adapters";
import { getEngine, persistRadar } from "@/lib/engine";
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
  const { email, password, displayName, inviteToken, waitlistEmail } = (
    body && typeof body === "object" ? body : {}
  ) as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    inviteToken?: unknown;
    waitlistEmail?: unknown;
  };
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof displayName !== "string"
  ) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const normalizedName = displayName.trim();
  if (!normalizedName || normalizedName.length > 120) {
    return NextResponse.json(
      { error: "Use a name between 1 and 120 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (email.length > 320 || password.length < 8 || password.length > 200) {
    return NextResponse.json(
      { error: "Use a password between 8 and 200 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const retryAfter = await consumeAuthRateLimit({
    ip: clientAddress(request),
    email,
  });
  if (retryAfter !== undefined) {
    return NextResponse.json(
      { error: "Too many account attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const engine = await getEngine();
  let account;
  try {
    ({ account } = engine.signUp(email, password, normalizedName));
  } catch (err) {
    const message =
      err instanceof AuthError &&
      !err.message.toLowerCase().includes("already exists")
        ? err.message
        : "We could not create your account. Check your details and try again.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  await persistRadar();

  // Invite redemption is deliberately best-effort for account creation. An
  // expired, replayed, or not-yet-migrated invite must not prevent a person
  // from creating an account. The adapter still performs the state transition
  // transactionally when the invite tables are available.
  let waitlistInviteState: string | undefined;
  if (
    process.env.DATABASE_URL &&
    (typeof inviteToken === "string" || typeof waitlistEmail === "string")
  ) {
    try {
      const redemption = await redeemWaitlistInvite({
        connectionString: process.env.DATABASE_URL,
        accountId: account.id,
        token: typeof inviteToken === "string" ? inviteToken : undefined,
        waitlistEmail:
          typeof waitlistEmail === "string" ? waitlistEmail : undefined,
      });
      waitlistInviteState = redemption.state;
    } catch {
      // Signup remains successful. A later authenticated redemption attempt
      // can retry after the invite migration is available.
      waitlistInviteState = "unavailable";
    }
  }

  const token = issueSessionToken(account.id);
  await trackPlatformAnalytics({
    eventName: "auth.signup_succeeded",
    source: "auth-api",
    accountId: account.id,
    properties: { method: "password" },
  });
  const response = NextResponse.json(
    {
      account: { id: account.id, email: account.email },
      waitlistInvite: waitlistInviteState
        ? { redeemed: waitlistInviteState === "redeemed" }
        : undefined,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
