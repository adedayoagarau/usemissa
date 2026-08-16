import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PublicPortfolioValidationError,
  type PublicPortfolioPublishInput,
} from "@missa/radar-engine";

import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";

const headers = { "Cache-Control": "no-store" };

function error(message: string, status: 400 | 401 | 404 | 500) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) return error("Not authenticated", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return error("Profile details must be an object.", 400);

  const engine = await getEngine();
  if (!engine.store.users.has(session.account.userId))
    return error("Profile not found", 404);
  try {
    const saved = engine.publishUserPortfolio(
      session.account.userId,
      body as PublicPortfolioPublishInput,
    );
    engine.recordAudit(
      session.account.id,
      "profile.published",
      "user_profile",
      saved.id,
      "Published fields: displayName, bio, profileImageUrl, headline, oneLine, openTo, socialLinks, selectedWorks",
    );
    await persistRadar();
    return NextResponse.json(
      {
        profile: engine.publicUserProfile(saved.id),
        publicProfilePublishedAt: saved.publicProfilePublishedAt,
      },
      { headers },
    );
  } catch (cause) {
    if (cause instanceof PublicPortfolioValidationError)
      return NextResponse.json(
        { error: cause.message, field: cause.field },
        { status: 400, headers },
      );
    console.error("Public Profile publish failed", cause);
    return error(
      "We could not publish your Profile. Check your connection and try again.",
      500,
    );
  }
}
