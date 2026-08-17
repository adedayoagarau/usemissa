import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { trackPlatformAnalytics } from "@/lib/platformAnalytics";

const FIRST_SAVE_SERVER_EVENTS = new Set([
  "discovery.opportunity_save_intent_created",
  "discovery.opportunity_saved",
  "auth.authentication_required",
  "auth.authentication_succeeded",
  "journey.intent_revalidated",
  "journey.material_change_presented",
  "journey.state_recovered",
  "journey.abandoned",
  "tracker.opportunity_created",
  "tracker.opportunity_already_saved",
  "tracker.next_action_presented",
  "tracker.next_action_completed",
  "journey.guidance_dismissed",
]);

export async function POST(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON body." },
      { status: 400 },
    );
  }

  const value =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const eventName = typeof value.eventName === "string" ? value.eventName : "";
  const path = typeof value.path === "string" ? value.path : undefined;
  const idempotencyKey =
    typeof value.idempotencyKey === "string" ? value.idempotencyKey : undefined;
  const properties =
    value.properties &&
    typeof value.properties === "object" &&
    !Array.isArray(value.properties)
      ? (value.properties as Record<string, unknown>)
      : undefined;

  if (!/^[A-Za-z0-9_.:-]{2,120}$/.test(eventName)) {
    return NextResponse.json(
      {
        error:
          "eventName must contain only letters, numbers, dots, underscores, colons, or hyphens.",
      },
      { status: 400 },
    );
  }
  if (
    !session &&
    eventName !== "page_view" &&
    !eventName.startsWith("public.")
  ) {
    return NextResponse.json(
      { error: "event is not available to anonymous visitors" },
      { status: 401 },
    );
  }
  if (!session && eventName === "page_view" && path && !isPublicPath(path)) {
    return NextResponse.json(
      { error: "anonymous page views are limited to public paths" },
      { status: 403 },
    );
  }
  if (path && path.length > 500)
    return NextResponse.json({ error: "path is too long." }, { status: 400 });
  if (FIRST_SAVE_SERVER_EVENTS.has(eventName)) {
    return NextResponse.json(
      {
        error: "this transition must be recorded by its authoritative service",
      },
      { status: 403 },
    );
  }
  await trackPlatformAnalytics({
    eventName,
    source: "web-client",
    ...(session?.account.id ? { accountId: session.account.id } : {}),
    path,
    properties,
    idempotencyKey,
  });
  return NextResponse.json(
    { accepted: true },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

function isPublicPath(path: string): boolean {
  return (
    path === "/" ||
    [
      "/about",
      "/methodology",
      "/waitlist",
      "/for-organizations",
      "/opportunities",
      "/guides",
      "/discover/",
      "/org/",
      "/profile/",
      "/login",
      "/signup",
    ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}
