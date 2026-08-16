import { NextResponse } from "next/server";

import {
  deliverProfileContactEmail,
  normalizeProfileContactInput,
  ProfileContactValidationError,
} from "@/lib/profile-contact";
import {
  getRateLimiter,
  PROFILE_CONTACT_IP_LIMIT,
  PROFILE_CONTACT_RECIPIENT_LIMIT,
  PROFILE_CONTACT_SENDER_LIMIT,
  readClientIp,
  tooManyRequests,
} from "@/lib/rate-limit";
import { getEngine } from "@/lib/engine";

const headers = { "Cache-Control": "no-store" };

function unavailable() {
  return NextResponse.json(
    { error: "Contact is unavailable for this Profile." },
    { status: 404, headers },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Add your contact details and message." },
      { status: 400, headers },
    );
  }
  const candidate =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  if (typeof candidate.website === "string" && candidate.website.trim())
    return NextResponse.json({ accepted: true }, { status: 202, headers });

  let contact;
  try {
    contact = normalizeProfileContactInput(candidate);
  } catch (cause) {
    if (cause instanceof ProfileContactValidationError)
      return NextResponse.json(
        { error: cause.message, field: cause.field },
        { status: 400, headers },
      );
    return NextResponse.json(
      { error: "Add your contact details and message." },
      { status: 400, headers },
    );
  }

  const { userId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(userId)) return unavailable();
  const limiter = await getRateLimiter();
  const byIp = await limiter.consume(
    PROFILE_CONTACT_IP_LIMIT,
    readClientIp(request),
  );
  const bySender = byIp.allowed
    ? await limiter.consume(PROFILE_CONTACT_SENDER_LIMIT, contact.senderEmail)
    : byIp;
  const decision = bySender.allowed
    ? await limiter.consume(PROFILE_CONTACT_RECIPIENT_LIMIT, userId)
    : bySender;
  if (!decision.allowed)
    return tooManyRequests(
      decision,
      "You have sent a few messages. Please wait before trying again.",
    );

  const engine = await getEngine();
  const publicProfile = engine.publicUserProfile(userId);
  if (
    !publicProfile ||
    publicProfile.isPrivate ||
    !publicProfile.contactEnabled
  )
    return unavailable();
  const account = [...engine.store.accounts.values()].find(
    (candidateAccount) =>
      candidateAccount.userId === userId && candidateAccount.active !== false,
  );
  if (!account?.email) return unavailable();

  try {
    const delivery = await deliverProfileContactEmail({
      contact,
      recipientAccountId: account.id,
      recipientEmail: account.email,
    });
    if (delivery === "unavailable")
      return NextResponse.json(
        { error: "We could not send your message. Try again." },
        { status: 503, headers },
      );
    return NextResponse.json({ accepted: true }, { status: 202, headers });
  } catch (cause) {
    console.error("Profile contact delivery failed", {
      userId,
      error: cause instanceof Error ? cause.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not send your message. Try again." },
      { status: 503, headers },
    );
  }
}
