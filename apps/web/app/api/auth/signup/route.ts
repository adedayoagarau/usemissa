import { NextResponse } from "next/server";
import { redeemWaitlistInvite } from "@missa/radar-adapters";
import { getEngine, persistRadar } from "@/lib/engine";
import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platformAnalytics";
import {
  getRateLimiter,
  readClientIp,
  SIGNUP_IP_LIMIT,
  tooManyRequests,
} from "@/lib/rate-limit";
import {
  FIRST_SAVE_INTENT_COOKIE,
  verifyFirstSaveIntent,
} from "@/lib/firstSaveIntent";

function cookieValue(request: Request): string | undefined {
  const encoded = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FIRST_SAVE_INTENT_COOKIE}=`))
    ?.slice(FIRST_SAVE_INTENT_COOKIE.length + 1);
  if (!encoded) return undefined;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

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
  if (email.length > 320) {
    return NextResponse.json(
      { error: "Use an email address up to 320 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const normalizedName = displayName.trim();
  const firstSaveIntent = verifyFirstSaveIntent(cookieValue(request));
  if ((!normalizedName && !firstSaveIntent) || normalizedName.length > 120) {
    return NextResponse.json(
      {
        error: firstSaveIntent
          ? "Use no more than 120 characters for your name."
          : "Use a name between 1 and 120 characters.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json(
      { error: "Use a password between 8 and 200 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  /**
   * Charged only once the payload is well formed, so malformed noise stays cheap
   * to reject and cannot spend a real visitor's window on their behalf.
   */
  const limiter = await getRateLimiter();
  const decision = await limiter.consume(
    SIGNUP_IP_LIMIT,
    readClientIp(request),
  );
  if (!decision.allowed) {
    return tooManyRequests(
      decision,
      "Too many sign up attempts. Please wait before trying again.",
    );
  }

  const engine = await getEngine();
  let account;
  try {
    ({ account } = engine.signUp(email, password, normalizedName));
  } catch (err) {
    const accountExists =
      err instanceof Error &&
      err.message.toLowerCase().includes("already exists");
    const message = accountExists
      ? "An account already uses this email. Log in instead."
      : "We could not create your account. Check your details and try again.";
    return NextResponse.json(
      { error: message, ...(accountExists ? { code: "account_exists" } : {}) },
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

  const token = issueSessionToken(account.id, account.sessionVersion ?? 0);
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
