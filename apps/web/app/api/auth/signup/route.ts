import { NextResponse } from "next/server";
import { AuthError } from "@missa/radar-engine";
import {
  CreatorAccountProvisionError,
  redeemWaitlistInvite,
} from "@missa/radar-adapters";
import { getEngine, persistRadar } from "@/lib/engine";
import { getCreatorAccountRepository } from "@/lib/creatorRepositories";
import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platformAnalytics";
import { clientAddress, consumeAuthRateLimit } from "@/lib/auth-rate-limit";
import { deliverWelcomeEmail } from "@/emails/welcome";
import { isNeonAuthConfigured } from "@/lib/neon-auth/server";
import { signupIdentity } from "@/lib/signupIdentity";

export async function POST(request: Request) {
  // Production password signup belongs to Neon Auth so email ownership cannot
  // be bypassed by posting directly to the compatibility endpoint. Local and
  // test environments without Neon keep the existing deterministic flow.
  if (isNeonAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Verify your email through the Missa signup form.",
        code: "email_verification_required",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const {
    email,
    password,
    givenName,
    familyName,
    usesSingleName,
    inviteToken,
    waitlistEmail,
  } = (body && typeof body === "object" ? body : {}) as {
    email?: unknown;
    password?: unknown;
    givenName?: unknown;
    familyName?: unknown;
    usesSingleName?: unknown;
    inviteToken?: unknown;
    waitlistEmail?: unknown;
  };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Your name, email address, and password are required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const identity = signupIdentity({ givenName, familyName, usesSingleName });
  if ("field" in identity) {
    return NextResponse.json(
      { error: identity.message, field: identity.field },
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

  let account;
  try {
    const repository = getCreatorAccountRepository();
    if (repository)
      ({ account } = await repository.provisionPasswordAccount({
        email,
        password,
        ...identity,
      }));
    else {
      const engine = await getEngine();
      ({ account } = engine.signUp(email, password, identity.displayName));
      account.displayName = identity.displayName;
      account.givenName = identity.givenName;
      account.familyName = identity.familyName;
      account.usesSingleName = identity.usesSingleName;
      await persistRadar();
    }
  } catch (err) {
    const accountExists =
      (err instanceof CreatorAccountProvisionError &&
        err.code === "account-exists") ||
      (err instanceof Error &&
        err.message.toLowerCase().includes("already exists"));
    const message = accountExists
      ? "An account already uses this email. Log in instead."
      : err instanceof AuthError
        ? err.message
        : "We could not create your account. Check your details and try again.";
    if (!accountExists && !(err instanceof AuthError))
      console.error("Account signup failed", err);
    return NextResponse.json(
      { error: message, ...(accountExists ? { code: "account_exists" } : {}) },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

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
  void deliverWelcomeEmail(
    {
      accountId: account.id,
      email: account.email,
      givenName: identity.givenName,
    },
    process.env.DATABASE_URL,
  ).catch((err) => {
    console.error("Welcome email delivery failed", err);
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
