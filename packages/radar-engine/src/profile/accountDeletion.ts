import type { IsoDateTime } from "../domain/types.js";
import type { RadarStore } from "../store/store.js";

export type AccountDeletionBlocker =
  | {
      kind: "sole-organization-owner";
      organizationId: string;
      organizationName: string;
    }
  | { kind: "platform-admin" };

export interface CreatorAccountErasureResult {
  accountId: string;
  userId?: string;
  publicAssetUrls: string[];
  privateStorageKeys: string[];
}

export interface CreatorAccountAssetRefs {
  publicAssetUrls: string[];
  privateStorageKeys: string[];
}

export class AccountDeletionBlockedError extends Error {
  constructor(readonly blockers: AccountDeletionBlocker[]) {
    const owner = blockers.find(
      (
        blocker,
      ): blocker is Extract<
        AccountDeletionBlocker,
        { kind: "sole-organization-owner" }
      > => blocker.kind === "sole-organization-owner",
    );
    super(
      owner
        ? `Transfer ownership of ${owner.organizationName} before deleting this account.`
        : "Remove this account's platform access before deleting it.",
    );
    this.name = "AccountDeletionBlockedError";
  }
}

export function accountDeletionBlockers(
  store: RadarStore,
  accountId: string,
): AccountDeletionBlocker[] {
  const account = store.accounts.get(accountId);
  if (!account) return [];
  const blockers: AccountDeletionBlocker[] = [];
  if (account.isAdmin) blockers.push({ kind: "platform-admin" });

  const ownedOrganizationIds = new Set(
    store.memberships
      .filter(
        (membership) =>
          membership.accountId === accountId && membership.role === "owner",
      )
      .map((membership) => membership.organizationId),
  );
  for (const organizationId of ownedOrganizationIds) {
    const anotherOwner = store.memberships.some(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.accountId !== accountId &&
        membership.role === "owner",
    );
    if (anotherOwner) continue;
    blockers.push({
      kind: "sole-organization-owner",
      organizationId,
      organizationName:
        store.organizations.get(organizationId)?.name ?? organizationId,
    });
  }
  return blockers;
}

export function creatorAccountAssetRefs(
  store: RadarStore,
  accountId: string,
): CreatorAccountAssetRefs {
  const userId = store.accounts.get(accountId)?.userId;
  if (!userId) return { publicAssetUrls: [], privateStorageKeys: [] };
  const publicAssetUrls = new Set<string>();
  const privateStorageKeys = new Set<string>();
  const user = store.users.get(userId);
  if (user?.publicPortfolio?.profileImageUrl)
    publicAssetUrls.add(user.publicPortfolio.profileImageUrl);
  for (const work of user?.publicPortfolio?.selectedWorks ?? []) {
    if (work.sample?.publicAssetUrl)
      publicAssetUrls.add(work.sample.publicAssetUrl);
  }
  for (const file of store.libraryFiles.values()) {
    if (file.userId === userId) privateStorageKeys.add(file.storageKey);
  }
  return {
    publicAssetUrls: [...publicAssetUrls],
    privateStorageKeys: [...privateStorageKeys],
  };
}

/**
 * Remove creator-owned product data while retaining an inactive, deidentified
 * account row for submitted applications and append-only audit records.
 */
export function eraseCreatorAccount(
  store: RadarStore,
  accountId: string,
  deletedAt: IsoDateTime,
): CreatorAccountErasureResult {
  const account = store.accounts.get(accountId);
  if (!account) throw new Error("Account not found");
  const blockers = accountDeletionBlockers(store, accountId);
  if (blockers.length) throw new AccountDeletionBlockedError(blockers);
  const userId = account.userId;
  const assets = creatorAccountAssetRefs(store, accountId);

  if (userId) {
    store.users.delete(userId);
    for (const [id, profile] of store.radarProfiles) {
      if (profile.userId === userId) store.radarProfiles.delete(id);
    }
    store.follows = store.follows.filter((follow) => follow.userId !== userId);
    store.tracked = store.tracked.filter((row) => row.userId !== userId);
    store.manualTrackerEntries = store.manualTrackerEntries.filter(
      (row) => row.userId !== userId,
    );
    store.forwardingAddresses = store.forwardingAddresses.filter(
      (row) => row.userId !== userId,
    );
    store.emailCandidates = store.emailCandidates.filter(
      (row) => row.userId !== userId,
    );
    store.gmailConnections = store.gmailConnections.filter(
      (row) => row.userId !== userId,
    );
    store.gmailSyncJobs = store.gmailSyncJobs.filter(
      (row) => row.userId !== userId,
    );
    store.gmailOAuthStates = store.gmailOAuthStates.filter(
      (row) => row.userId !== userId,
    );
    for (const [id, work] of store.libraryWorks) {
      if (work.userId === userId) store.libraryWorks.delete(id);
    }
    for (const [id, file] of store.libraryFiles) {
      if (file.userId === userId) store.libraryFiles.delete(id);
    }
    for (const [id, answer] of store.savedAnswers) {
      if (answer.userId === userId) store.savedAnswers.delete(id);
    }
    const checklistIds = new Set<string>();
    for (const [id, checklist] of store.checklists) {
      if (checklist.userId !== userId) continue;
      checklistIds.add(id);
      store.checklists.delete(id);
    }
    for (const [id, item] of store.checklistItems) {
      if (checklistIds.has(item.checklistId)) store.checklistItems.delete(id);
    }
    const listIds = new Set<string>();
    for (const [id, list] of store.customLists) {
      if (list.userId !== userId) continue;
      listIds.add(id);
      store.customLists.delete(id);
    }
    for (const [key, membership] of store.customListMemberships) {
      if (membership.userId === userId || listIds.has(membership.listId))
        store.customListMemberships.delete(key);
    }
    for (const [id, alert] of store.alerts) {
      if (alert.userId === userId) store.alerts.delete(id);
    }
    for (const key of store.emittedAlertKeys) {
      if (key.includes(userId)) store.emittedAlertKeys.delete(key);
    }
  }
  store.memberships = store.memberships.filter(
    (membership) => membership.accountId !== accountId,
  );

  account.email = `deleted+${account.id}@users.invalid`;
  account.passwordHash = "deleted:deleted";
  account.active = false;
  account.deletedAt = deletedAt;
  delete account.userId;
  delete account.authUserId;
  delete account.authProvider;
  delete account.externalId;
  delete account.displayName;
  delete account.verifiedEmailDomain;

  return {
    accountId,
    ...(userId ? { userId } : {}),
    publicAssetUrls: assets.publicAssetUrls,
    privateStorageKeys: assets.privateStorageKeys,
  };
}
