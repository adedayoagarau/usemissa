import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { copy, del } from "@vercel/blob";
import { PublicPortfolioValidationError } from "@missa/radar-engine";
import {
  handleNamespaceAvailable,
  readUserHandle,
} from "@missa/radar-adapters";

import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { getEngine, persistRadar } from "@/lib/engine";
import {
  materializeProfileSamples,
  profileSampleAssetUrls,
} from "@/lib/profile-sample-publication";

const headers = { "Cache-Control": "no-store" };

function missaPhotoUrl(value: string | undefined, userId: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".public.blob.vercel-storage.com"))
      return undefined;
    if (!url.pathname.startsWith(`/missa/profiles/${userId}/`))
      return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function error(message: string, status: 400 | 401 | 404 | 409 | 500 | 503) {
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
  if (process.env.DATABASE_URL) {
    const namespaceReady = await handleNamespaceAvailable(
      process.env.DATABASE_URL,
    ).catch(() => false);
    if (!namespaceReady)
      return error("Profile publishing is not available yet.", 503);
    const handle = await readUserHandle(
      process.env.DATABASE_URL,
      session.account.userId,
    ).catch(() => null);
    if (!handle)
      return error("Claim a handle before publishing your Profile.", 409);
  }
  try {
    const previousSampleUrls = profileSampleAssetUrls(
      engine.store.users.get(session.account.userId)?.publicPortfolio,
      session.account.userId,
    );
    const previousPhotoUrl = missaPhotoUrl(
      engine.store.users.get(session.account.userId)?.publicPortfolio
        ?.profileImageUrl,
      session.account.userId,
    );
    const materialized = await materializeProfileSamples({
      body: body as Record<string, unknown>,
      userId: session.account.userId,
      engine,
      now: new Date(),
      copyBlob: copy,
    });
    let saved;
    try {
      saved = engine.publishUserPortfolio(
        session.account.userId,
        materialized.input,
      );
      await persistRadar();
    } catch (publishCause) {
      if (materialized.createdAssetUrls.length)
        await del(materialized.createdAssetUrls, {
          ...(process.env.BLOB_READ_WRITE_TOKEN
            ? { token: process.env.BLOB_READ_WRITE_TOKEN }
            : {}),
        }).catch(() => undefined);
      throw publishCause;
    }
    engine.recordAudit(
      session.account.id,
      "profile.published",
      "user_profile",
      saved.id,
      "Published fields: displayName, bio, profileImageUrl, headline, oneLine, openTo, contactEnabled, socialLinks, selectedWorks",
    );
    const nextSampleUrls = new Set(
      profileSampleAssetUrls(saved.publicPortfolio, session.account.userId),
    );
    const retiredSampleUrls = previousSampleUrls.filter(
      (url) => !nextSampleUrls.has(url),
    );
    if (retiredSampleUrls.length)
      await del(retiredSampleUrls, {
        ...(process.env.BLOB_READ_WRITE_TOKEN
          ? { token: process.env.BLOB_READ_WRITE_TOKEN }
          : {}),
      }).catch((cleanupCause) =>
        console.error("Previous Profile sample cleanup failed", cleanupCause),
      );
    if (
      previousPhotoUrl &&
      previousPhotoUrl !== saved.publicPortfolio?.profileImageUrl
    ) {
      try {
        await del(previousPhotoUrl, {
          ...(process.env.BLOB_READ_WRITE_TOKEN
            ? { token: process.env.BLOB_READ_WRITE_TOKEN }
            : {}),
        });
      } catch (cleanupCause) {
        console.error("Previous Profile photo cleanup failed", cleanupCause);
      }
    }
    return NextResponse.json(
      {
        profile: engine.publicUserProfile(saved.id),
        publicProfilePublishedAt: saved.publicProfilePublishedAt,
      },
      { headers },
    );
  } catch (cause) {
    if (
      cause instanceof PublicPortfolioValidationError ||
      (cause instanceof Error &&
        cause.name === "PublicPortfolioValidationError")
    )
      return NextResponse.json(
        {
          error: cause.message,
          field:
            "field" in cause && typeof cause.field === "string"
              ? cause.field
              : "selectedWorks",
        },
        { status: 400, headers },
      );
    console.error("Public Profile publish failed", cause);
    return error(
      "We could not publish your Profile. Check your connection and try again.",
      500,
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session?.account.userId) return error("Not authenticated", 401);

  const engine = await getEngine();
  const user = engine.store.users.get(session.account.userId);
  if (!user) return error("Profile not found", 404);
  if (!user.publicProfilePublishedAt)
    return NextResponse.json(
      { unpublished: true, alreadyUnpublished: true },
      { headers },
    );

  const assetUrls = [
    ...(missaPhotoUrl(
      user.publicPortfolio?.profileImageUrl,
      session.account.userId,
    )
      ? [user.publicPortfolio!.profileImageUrl!]
      : []),
    ...profileSampleAssetUrls(user.publicPortfolio, session.account.userId),
  ];
  try {
    engine.unpublishUserPortfolio(session.account.userId);
    engine.recordAudit(
      session.account.id,
      "profile.unpublished",
      "user_profile",
      user.id,
    );
    await persistRadar();
    if (assetUrls.length)
      await del(assetUrls, {
        ...(process.env.BLOB_READ_WRITE_TOKEN
          ? { token: process.env.BLOB_READ_WRITE_TOKEN }
          : {}),
      }).catch((cleanupCause) =>
        console.error("Profile asset cleanup failed", cleanupCause),
      );
    return NextResponse.json({ unpublished: true }, { headers });
  } catch (cause) {
    console.error("Public Profile unpublish failed", cause);
    return error("We could not unpublish your Profile. Try again.", 500);
  }
}
