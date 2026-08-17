import { NextResponse } from "next/server";
import {
  verifyPassword,
  type AccountDeletionBlocker,
} from "@missa/radar-engine";
import type { AccountDeletionRequest } from "@missa/radar-adapters";

import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionPreparation,
  resumeAccountDeletion,
} from "@/lib/account-deletion";
import { getAccountDeletionQueue } from "@/lib/account-deletion-queue";
import {
  getSessionAccount,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { getNeonAuth } from "@/lib/neon-auth/server";

const headers = { "Cache-Control": "private, no-store" };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function blockerMessage(blockers: AccountDeletionBlocker[]): string {
  const owner = blockers.find(
    (blocker) => blocker.kind === "sole-organization-owner",
  );
  if (owner?.kind === "sole-organization-owner")
    return `Transfer ownership of ${owner.organizationName} before deleting your account.`;
  return "Platform administrators must remove their platform access before deleting their account.";
}

export async function DELETE(request: Request) {
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return response({ error: "Not authenticated" }, 401);

  const body = (await request.json().catch(() => null)) as {
    confirmation?: unknown;
    password?: unknown;
  } | null;
  if (!body)
    return response({ error: "Request body must be valid JSON." }, 400);
  if (body.confirmation !== ACCOUNT_DELETION_CONFIRMATION)
    return response(
      { error: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm.` },
      400,
    );

  const preparation = await accountDeletionPreparation(session.account.id);
  if (preparation.blockers.length)
    return response(
      {
        error: blockerMessage(preparation.blockers),
        blockers: preparation.blockers,
      },
      409,
    );

  if (session.account.authProvider !== "neon-auth") {
    if (
      typeof body.password !== "string" ||
      !verifyPassword(body.password, session.account.passwordHash)
    )
      return response({ error: "Enter your current password." }, 403);
  }

  const queue = getAccountDeletionQueue();
  if (queue && !(await queue.available()))
    return response(
      { error: "Account deletion is not available yet. Try again later." },
      503,
    );

  let deletion: AccountDeletionRequest;
  if (queue) {
    await queue.prepare({
      accountId: session.account.id,
      userId: session.account.userId,
      authProvider: session.account.authProvider,
      authUserId: session.account.authUserId,
      publicAssetUrls: preparation.publicAssetUrls,
      privateAssetRefs: preparation.privateAssetRefs,
    });
    const claimed = await queue.claimByAccount(session.account.id);
    if (!claimed)
      return response(
        { error: "Account deletion is already being processed." },
        409,
      );
    deletion = claimed;
  } else {
    const now = new Date().toISOString();
    deletion = {
      id: crypto.randomUUID(),
      accountId: session.account.id,
      ...(session.account.userId ? { userId: session.account.userId } : {}),
      ...(session.account.authProvider
        ? { authProvider: session.account.authProvider }
        : {}),
      ...(session.account.authUserId
        ? { authUserId: session.account.authUserId }
        : {}),
      status: "processing",
      stage: "prepared",
      publicAssetUrls: preparation.publicAssetUrls,
      privateAssetRefs: preparation.privateAssetRefs,
      retainedSubmissions: 0,
      retainedCompletedReviews: 0,
      attemptCount: 1,
      requestedAt: now,
      updatedAt: now,
    };
  }

  try {
    if (session.account.authProvider === "neon-auth") {
      const auth = getNeonAuth();
      if (!auth) throw new Error("Authentication is temporarily unavailable.");
      const result = await auth.deleteUser(
        typeof body.password === "string" ? { password: body.password } : {},
      );
      if (result.error)
        throw new Error("We could not remove your sign-in account.");
    }
    await queue?.advance(deletion.id, "auth-erased");
    deletion = { ...deletion, stage: "auth-erased" };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Authentication cleanup failed.";
    await queue?.fail(deletion.id, message);
    return response({ error: message }, 503);
  }

  let cleanup:
    | { retainedSubmissions: number; retainedCompletedReviews: number }
    | undefined;
  let accepted = false;
  try {
    cleanup = await resumeAccountDeletion(deletion, queue);
  } catch (cause) {
    console.error("Account deletion queued for retry", cause);
    accepted = true;
  }

  const result = response(
    accepted
      ? { status: "processing" }
      : {
          status: "deleted",
          retainedSubmissions: cleanup?.retainedSubmissions ?? 0,
          retainedCompletedReviews: cleanup?.retainedCompletedReviews ?? 0,
        },
    accepted ? 202 : 200,
  );
  result.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return result;
}
