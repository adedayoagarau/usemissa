import { NextResponse } from "next/server";
import { redeemWaitlistInvite } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Invites are temporarily unavailable." },
      { status: 503 },
    );
  const body = await request.json().catch(() => null);
  const token =
    body &&
    typeof body === "object" &&
    "token" in body &&
    typeof body.token === "string"
      ? body.token.trim()
      : undefined;
  const waitlistEmail =
    body &&
    typeof body === "object" &&
    "waitlistEmail" in body &&
    typeof body.waitlistEmail === "string"
      ? body.waitlistEmail.trim()
      : undefined;
  if (!token && !waitlistEmail)
    return NextResponse.json(
      { error: "Invite token or waitlist email required." },
      { status: 400 },
    );
  try {
    const result = await redeemWaitlistInvite({
      connectionString: process.env.DATABASE_URL,
      accountId: session.account.id,
      token,
      waitlistEmail,
    });
    if (result.state === "redeemed")
      return NextResponse.json({
        redeemed: true,
        protectedUntil: result.protectedUntil,
      });
    if (result.state === "already-used")
      return NextResponse.json({
        redeemed: false,
        message: "This invite has already been used.",
      });
    if (result.state === "expired")
      return NextResponse.json({
        redeemed: false,
        message: "This invite has expired.",
      });
    if (result.state === "revoked")
      return NextResponse.json({
        redeemed: false,
        message: "This invite is no longer active.",
      });
    if (result.state === "unavailable")
      return NextResponse.json(
        { error: "Invites are temporarily unavailable." },
        { status: 503 },
      );
    return NextResponse.json({
      redeemed: false,
      message: "We could not use that invite.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invites are temporarily unavailable." },
      { status: 503 },
    );
  }
}
