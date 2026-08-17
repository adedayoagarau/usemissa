import { del } from "@vercel/blob";
import {
  accountDeletionBlockers,
  cloneStore as cloneRadarStore,
  creatorAccountAssetRefs,
  eraseCreatorAccount,
} from "@missa/radar-engine";
import {
  applyDeletedUserHandlePolicy,
  type AccountDeletionRequest,
  type AccountDeletionStage,
} from "@missa/radar-adapters";
import {
  cloneStore as cloneWorkspaceStore,
  eraseWorkspaceAccountData,
  workspaceAccountDraftAssetUrls,
} from "@missa/workspace-engine";

import { getEngine, persistRadar } from "@/lib/engine";
import { getWorkspaceEngine, persistWorkspace } from "@/lib/workspaceEngine";

export const ACCOUNT_DELETION_CONFIRMATION = "DELETE MY ACCOUNT";

export type DeletionQueueProgress = {
  advance(
    id: string,
    stage: AccountDeletionStage,
    retained?: { submissions: number; completedReviews: number },
  ): Promise<void>;
  complete(id: string): Promise<void>;
  fail(id: string, message: string): Promise<void>;
};

const STAGE_ORDER: AccountDeletionStage[] = [
  "prepared",
  "auth-erased",
  "workspace-erased",
  "radar-erased",
  "assets-erased",
  "completed",
];

function before(current: AccountDeletionStage, target: AccountDeletionStage) {
  return STAGE_ORDER.indexOf(current) < STAGE_ORDER.indexOf(target);
}

function deletableBlobRef(value: string): boolean {
  if (!/^https?:\/\//u.test(value))
    return !value.includes("..") && !value.startsWith("/");
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function accountDeletionPreparation(accountId: string) {
  const [radar, workspace] = await Promise.all([
    getEngine(),
    getWorkspaceEngine(),
  ]);
  const account = radar.store.accounts.get(accountId);
  if (!account) throw new Error("Account not found");
  const creatorAssets = creatorAccountAssetRefs(radar.store, accountId);
  return {
    account,
    blockers: accountDeletionBlockers(radar.store, accountId),
    publicAssetUrls: creatorAssets.publicAssetUrls,
    privateAssetRefs: [
      ...creatorAssets.privateStorageKeys,
      ...workspaceAccountDraftAssetUrls(workspace.store, accountId),
    ],
  };
}

/**
 * Resume the durable, idempotent part of deletion after authentication has
 * been erased. A request at `prepared` is deliberately not processed by a
 * worker because only the signed-in request can remove its Neon Auth user.
 */
export async function resumeAccountDeletion(
  request: AccountDeletionRequest,
  queue?: DeletionQueueProgress,
): Promise<{ retainedSubmissions: number; retainedCompletedReviews: number }> {
  if (request.stage === "prepared")
    throw new Error("Authentication must be removed before account cleanup.");
  let stage = request.stage;
  let retainedSubmissions = request.retainedSubmissions;
  let retainedCompletedReviews = request.retainedCompletedReviews;

  try {
    if (before(stage, "workspace-erased")) {
      const workspace = await getWorkspaceEngine();
      const beforeErase = cloneWorkspaceStore(workspace.store);
      const result = eraseWorkspaceAccountData(
        workspace.store,
        request.accountId,
      );
      try {
        await persistWorkspace();
      } catch (cause) {
        Object.assign(workspace.store, beforeErase);
        throw cause;
      }
      retainedSubmissions = result.retainedSubmissions;
      retainedCompletedReviews = result.retainedCompletedReviews;
      await queue?.advance(request.id, "workspace-erased", {
        submissions: retainedSubmissions,
        completedReviews: retainedCompletedReviews,
      });
      stage = "workspace-erased";
    }

    if (before(stage, "radar-erased")) {
      const radar = await getEngine();
      const account = radar.store.accounts.get(request.accountId);
      if (account?.active !== false) {
        const beforeErase = cloneRadarStore(radar.store);
        radar.recordAudit(
          request.accountId,
          "account.deletion_requested",
          "account",
          request.accountId,
          JSON.stringify({ fields: ["account", "profile", "creator-data"] }),
        );
        eraseCreatorAccount(
          radar.store,
          request.accountId,
          new Date().toISOString(),
        );
        try {
          await persistRadar();
        } catch (cause) {
          Object.assign(radar.store, beforeErase);
          throw cause;
        }
      }
      if (process.env.DATABASE_URL && request.userId) {
        await applyDeletedUserHandlePolicy({
          connectionString: process.env.DATABASE_URL,
          userId: request.userId,
          deletedAt: new Date(),
        });
      }
      await queue?.advance(request.id, "radar-erased");
      stage = "radar-erased";
    }

    if (before(stage, "assets-erased")) {
      const refs = [
        ...new Set([...request.publicAssetUrls, ...request.privateAssetRefs]),
      ].filter(deletableBlobRef);
      if (refs.length) {
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token && !process.env.VERCEL_OIDC_TOKEN)
          throw new Error("Blob deletion is not configured.");
        await del(refs, token ? { token } : {});
      }
      await queue?.advance(request.id, "assets-erased");
      stage = "assets-erased";
    }

    await queue?.complete(request.id);
    return { retainedSubmissions, retainedCompletedReviews };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Account cleanup failed.";
    await queue?.fail(request.id, message);
    throw cause;
  }
}
