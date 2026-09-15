import { NextResponse } from "next/server";

import {
  issueSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import {
  NeonAuthAccountError,
  provisionNeonAuthAccount,
} from "@/lib/neon-auth/account";
import { isNeonAuthConfigured } from "@/lib/neon-auth/server";
import { trackPlatformAnalytics } from "@/lib/platformAnalytics";
import { deliverWelcomeEmail } from "@/emails/welcome";
import { signupIdentity } from "@/lib/signupIdentity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isNeonAuthConfigured()) {
    return NextResponse.json(
      { error: "Neon Auth is not configured for this environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const mode =
    body && typeof body === "object" && "mode" in body && body.mode === "signup"
      ? "signup"
      : "login";
  const identityResult = signupIdentity({
    givenName:
      body && typeof body === "object" && "givenName" in body
        ? body.givenName
        : undefined,
    familyName:
      body && typeof body === "object" && "familyName" in body
        ? body.familyName
        : undefined,
    usesSingleName:
      body && typeof body === "object" && "usesSingleName" in body
        ? body.usesSingleName
        : false,
  });
  const identity =
    mode === "signup" && !("field" in identityResult)
      ? identityResult
      : undefined;

  try {
    if (mode === "signup" && !identity) {
      return NextResponse.json(
        {
          error:
            "Enter your name again so we can finish creating your account.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const { account, created } = await provisionNeonAuthAccount(identity);
    const token = issueSessionToken(account.id);
    void trackPlatformAnalytics({
      eventName:
        created || mode === "signup"
          ? "auth.signup_succeeded"
          : "auth.login_succeeded",
      source: "neon-auth-bridge",
      accountId: account.id,
      properties: { method: "neon-auth", linked: !created },
    });
    // Google-first accounts skip /api/auth/signup, so the bridge owns the same
    // welcome email. Delivery stays best-effort and idempotent per account.
    if (created) {
      void deliverWelcomeEmail(
        {
          accountId: account.id,
          email: account.email,
          givenName: account.givenName,
        },
        process.env.DATABASE_URL,
      ).catch((error) => {
        console.error("Welcome email delivery failed", error);
      });
    }

    const response = NextResponse.json(
      {
        account: { id: account.id, email: account.email },
        created,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof NeonAuthAccountError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "We could not connect your Missa account. Try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
