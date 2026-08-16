import { NextResponse } from "next/server";
import {
  createProfileIssueReport,
  PROFILE_ISSUE_REASONS,
  type ProfileIssueReason,
} from "@missa/radar-adapters";

import { getSessionAccount } from "@/lib/auth";
import { getEngine } from "@/lib/engine";
import {
  getRateLimiter,
  PROFILE_REPORT_IP_LIMIT,
  PROFILE_REPORT_TARGET_LIMIT,
  readClientIp,
  tooManyRequests,
} from "@/lib/rate-limit";

const headers = { "Cache-Control": "no-store" };

function unavailable() {
  return NextResponse.json(
    { error: "This Profile cannot be reported." },
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
      { error: "Choose a reason for your report." },
      { status: 400, headers },
    );
  }
  const candidate =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  if (typeof candidate.website === "string" && candidate.website.trim())
    return NextResponse.json({ accepted: true }, { status: 202, headers });

  const reason =
    typeof candidate.reason === "string" &&
    PROFILE_ISSUE_REASONS.includes(candidate.reason as ProfileIssueReason)
      ? (candidate.reason as ProfileIssueReason)
      : undefined;
  const note =
    typeof candidate.note === "string" ? candidate.note.trim() : undefined;
  const idempotencyKey =
    typeof candidate.idempotencyKey === "string"
      ? candidate.idempotencyKey.trim()
      : "";
  if (!reason)
    return NextResponse.json(
      { error: "Choose a reason for your report.", field: "reason" },
      { status: 400, headers },
    );
  if (note && note.length > 2_000)
    return NextResponse.json(
      { error: "Keep the details under 2,000 characters.", field: "note" },
      { status: 400, headers },
    );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      idempotencyKey,
    )
  )
    return NextResponse.json(
      { error: "Start a new report and try again." },
      { status: 400, headers },
    );

  const { userId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(userId)) return unavailable();
  const engine = await getEngine();
  const profile = engine.publicUserProfile(userId);
  if (!profile || profile.isPrivate) return unavailable();

  const limiter = await getRateLimiter();
  const byIp = await limiter.consume(
    PROFILE_REPORT_IP_LIMIT,
    readClientIp(request),
  );
  const decision = byIp.allowed
    ? await limiter.consume(PROFILE_REPORT_TARGET_LIMIT, userId)
    : byIp;
  if (!decision.allowed)
    return tooManyRequests(
      decision,
      "You have sent a few reports. Please wait before trying again.",
    );

  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "We could not send your report. Try again." },
      { status: 503, headers },
    );

  const session = await getSessionAccount(request.headers.get("cookie"));
  try {
    const result = await createProfileIssueReport(process.env.DATABASE_URL, {
      profileUserId: userId,
      ...(session?.account.id ? { reporterAccountId: session.account.id } : {}),
      reason,
      ...(note ? { note } : {}),
      idempotencyKey,
    });
    return NextResponse.json(
      { accepted: true, idempotent: result.idempotent },
      { status: 202, headers },
    );
  } catch (cause) {
    console.error("Profile report failed", {
      userId,
      error: cause instanceof Error ? cause.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "We could not send your report. Try again." },
      { status: 503, headers },
    );
  }
}
