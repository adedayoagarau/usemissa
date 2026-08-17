import assert from "node:assert/strict";
import { test } from "node:test";

import {
  accountDeletionBlockers,
  createStore,
  eraseCreatorAccount,
} from "../src/index.js";

test("account deletion is blocked while the account is an organization's only owner", () => {
  const store = createStore();
  store.accounts.set("account_owner", {
    id: "account_owner",
    email: "owner@example.com",
    passwordHash: "salt:hash",
    userId: "user_owner",
    isAdmin: false,
    createdAt: "2026-08-16T00:00:00.000Z",
  });
  store.organizations.set("org_one", {
    id: "org_one",
    name: "One Journal",
    domains: [],
    verified: false,
  });
  store.memberships.push({
    accountId: "account_owner",
    organizationId: "org_one",
    role: "owner",
    grantedAt: "2026-08-16T00:00:00.000Z",
  });

  assert.deepEqual(accountDeletionBlockers(store, "account_owner"), [
    {
      kind: "sole-organization-owner",
      organizationId: "org_one",
      organizationName: "One Journal",
    },
  ]);
  assert.throws(
    () =>
      eraseCreatorAccount(store, "account_owner", "2026-08-16T01:00:00.000Z"),
    /Transfer ownership of One Journal/u,
  );
});

test("account deletion erases creator-owned data and leaves a deidentified tombstone", () => {
  const store = createStore();
  store.accounts.set("account_creator", {
    id: "account_creator",
    email: "creator@example.com",
    passwordHash: "salt:hash",
    authProvider: "neon-auth",
    authUserId: "auth_private",
    userId: "user_creator",
    isAdmin: false,
    createdAt: "2026-08-16T00:00:00.000Z",
  });
  store.users.set("user_creator", {
    id: "user_creator",
    displayName: "Creator Name",
    genres: ["poetry"],
    attributes: { location: "private" },
    publicProfilePublishedAt: "2026-08-16T00:00:00.000Z",
    publicPortfolio: {
      profileImageUrl: "https://store.example/profile.jpg",
      socialLinks: [],
      selectedWorks: [
        {
          id: "public_work",
          title: "Public Work",
          sample: {
            kind: "image",
            publicAssetUrl: "https://store.example/sample.jpg",
            accessibilityText: "A painting",
            rightsConfirmedAt: "2026-08-16T00:00:00.000Z",
          },
        },
      ],
    },
  });
  store.radarProfiles.set("search_one", {
    id: "search_one",
    userId: "user_creator",
    name: "Residencies",
    criteria: {},
  });
  store.follows.push({
    userId: "user_creator",
    organizationId: "org_one",
    followedAt: "2026-08-16T00:00:00.000Z",
  });
  store.tracked.push({
    userId: "user_creator",
    opportunityId: "opp_one",
    trackedAt: "2026-08-16T00:00:00.000Z",
    notify: true,
    myStatus: "saved",
    events: [],
  });
  store.libraryFiles.set("file_one", {
    id: "file_one",
    userId: "user_creator",
    filename: "private.pdf",
    contentType: "application/pdf",
    byteLength: 10,
    storageKey: "missa/user_creator/private.pdf",
    createdAt: "2026-08-16T00:00:00.000Z",
  });
  store.libraryWorks.set("work_one", {
    id: "work_one",
    userId: "user_creator",
    title: "Private Work",
    fileId: "file_one",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  store.savedAnswers.set("answer_one", {
    id: "answer_one",
    userId: "user_creator",
    name: "Biography",
    body: "Private answer",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  store.checklists.set("checklist_one", {
    id: "checklist_one",
    userId: "user_creator",
    opportunityId: "opp_one",
    trackedAt: "2026-08-16T00:00:00.000Z",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  store.checklistItems.set("item_one", {
    id: "item_one",
    checklistId: "checklist_one",
    label: "Portfolio",
    normalizedKey: "portfolio",
    order: 0,
    state: "ready",
    source: "user-added",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  store.customLists.set("list_one", {
    id: "list_one",
    userId: "user_creator",
    name: "Maybe",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  store.customListMemberships.set("user_creator:list_one:opp_one", {
    userId: "user_creator",
    listId: "list_one",
    opportunityId: "opp_one",
    addedAt: "2026-08-16T00:00:00.000Z",
  });
  store.alerts.set("alert_one", {
    id: "alert_one",
    audience: "user",
    userId: "user_creator",
    kind: "new-match",
    title: "Private alert",
    body: "Private body",
    reason: "Private reason",
    createdAt: "2026-08-16T00:00:00.000Z",
    read: false,
  });
  store.emittedAlertKeys.add("closing-soon:user_creator:opp_one");

  const result = eraseCreatorAccount(
    store,
    "account_creator",
    "2026-08-16T01:00:00.000Z",
  );

  assert.deepEqual(result, {
    accountId: "account_creator",
    userId: "user_creator",
    publicAssetUrls: [
      "https://store.example/profile.jpg",
      "https://store.example/sample.jpg",
    ],
    privateStorageKeys: ["missa/user_creator/private.pdf"],
  });
  assert.equal(store.users.has("user_creator"), false);
  assert.equal(store.radarProfiles.size, 0);
  assert.equal(store.follows.length, 0);
  assert.equal(store.tracked.length, 0);
  assert.equal(store.libraryWorks.size, 0);
  assert.equal(store.libraryFiles.size, 0);
  assert.equal(store.savedAnswers.size, 0);
  assert.equal(store.checklists.size, 0);
  assert.equal(store.checklistItems.size, 0);
  assert.equal(store.customLists.size, 0);
  assert.equal(store.customListMemberships.size, 0);
  assert.equal(store.alerts.size, 0);
  assert.equal(store.emittedAlertKeys.size, 0);
  assert.deepEqual(store.memberships, []);
  assert.deepEqual(store.accounts.get("account_creator"), {
    id: "account_creator",
    email: "deleted+account_creator@users.invalid",
    passwordHash: "deleted:deleted",
    isAdmin: false,
    createdAt: "2026-08-16T00:00:00.000Z",
    active: false,
    deletedAt: "2026-08-16T01:00:00.000Z",
  });
});
