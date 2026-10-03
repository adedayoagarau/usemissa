import { NextResponse } from "next/server";
import { creatorBillingAccount, creatorPoolFor } from "@missa/radar-adapters";
import { getSessionAccount, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { closeAccountAfterCancellingPlus } from "@/lib/creatorBilling";
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
  const accountId = session.account.id;
  try {
    // A paid Plus subscription is cancelled in Stripe before the account closes,
    // so a closed account is never charged again.
    const closure = await closeAccountAfterCancellingPlus(accountId, {
      billing: async () => (process.env.DATABASE_URL ? creatorBillingAccount(creatorPoolFor(process.env.DATABASE_URL), accountId) : undefined),
      close: () => repository.closeAccount(accountId),
    });
    if (closure.status === "billing-failed") {
      return NextResponse.json(
        { error: "We could not cancel your Plus subscription, so your account is still open. Please try again, or cancel Plus from your plan page first." },
        { status: 502 },
      );
    }
    if (closure.status === "not-found") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    await getNeonAuth()?.signOut().catch(() => undefined);
    const response = NextResponse.json({ closed: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return response;
  } catch {
    return NextResponse.json({ error: "We could not close your account. Please try again." }, { status: 503 });
  }
}
