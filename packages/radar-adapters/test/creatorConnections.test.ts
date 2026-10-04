import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import {
  InquiryRateLimitError,
  PostgresCreatorConnectionsRepository,
} from "../src/creatorConnectionsRepository.js";

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create table radar_accounts(id text primary key, email text, data jsonb not null);
    create table handles(handle_key text, display_handle text, subject_type text, subject_id text, state text);
    create table creator_portfolio_drafts(account_id text primary key, published_data jsonb, published_at timestamptz);
    create table radar_organizations(id text primary key, data jsonb not null);
    create table gary_profiles(id text primary key, name text);
    create table opportunities(id text primary key, slug text, title text not null, organization_id text,
      status text, publication_state text, deadline_date date);
    insert into radar_accounts values
      ('creator','riley@example.com','{"userId":"u-creator","displayName":"Riley"}'),
      ('fan','fan@example.com','{"userId":"u-fan","displayName":"Sam"}'),
      ('editor','ed@example.com','{"userId":"u-editor","displayName":"Ede"}'),
      ('gone','x@example.com','{"userId":"u-gone","displayName":"Gone","active":false}');
    insert into handles values ('riley','riley','user','u-creator','claimed');
    insert into creator_portfolio_drafts values ('creator','{"name":"Riley Chen"}',now());
    insert into radar_organizations values ('org','{"name":"Quiet Review data"}'),('other','{"name":"Other"}');
    insert into gary_profiles values ('org','The Quiet Review');
    insert into opportunities values
      ('open-call','open-call','Spring reading period','org','open','published',current_date + 30),
      ('closed-call',null,'Winter issue','org','closed','published',current_date - 3),
      ('draft-call',null,'Unpublished','org','open','draft',null),
      ('other-call',null,'Somebody else''s call','other','open','published',null);
  `);
  await db.exec(
    await readFile(new URL("../../../db/migrations/0088_creator_profile_connections.sql", import.meta.url), "utf8"),
  );
  const client = { query: (sql: string, params?: unknown[]) => db.query(sql, params), release() {} };
  const repo = new PostgresCreatorConnectionsRepository({ ...client, connect: async () => client } as unknown as Pool);
  return { db, repo };
}

test("follows are per account, idempotent and never self-referential", async () => {
  const { db, repo } = await setup();
  try {
    await repo.follow("fan", "creator");
    await repo.follow("fan", "creator");
    await repo.follow("gone", "creator");
    assert.equal(await repo.isFollowing("fan", "creator"), true);
    assert.equal(await repo.isFollowing("creator", "fan"), false);
    await assert.rejects(repo.follow("creator", "creator"));
    // Deactivated accounts are not listed.
    assert.deepEqual((await repo.followers("creator")).map((p) => p.name), ["Sam"]);
    const following = await repo.following("fan");
    assert.equal(following[0]?.name, "Riley Chen");
    assert.equal(following[0]?.handle, "riley");
    assert.equal((await repo.counts("creator")).followers, 2);
    await repo.unfollow("fan", "creator");
    assert.equal(await repo.isFollowing("fan", "creator"), false);
  } finally {
    await db.close();
  }
});

test("inquiries are private to the creator, rate limited and change status", async () => {
  const { db, repo } = await setup();
  try {
    const sent = await repo.createInquiry({
      creatorAccountId: "creator", senderName: "Ada", senderEmail: "ada@example.com",
      topic: "commission", message: "Could we talk about a commission?", senderKey: "k1",
    });
    assert.equal(sent.status, "new");
    for (let i = 0; i < 2; i++)
      await repo.createInquiry({
        creatorAccountId: "creator", senderName: "Ada", senderEmail: "ada@example.com",
        topic: "other", message: `Follow-up ${i}`, senderKey: "k1",
      });
    await assert.rejects(
      repo.createInquiry({
        creatorAccountId: "creator", senderName: "Ada", senderEmail: "ada@example.com",
        topic: "other", message: "Fourth", senderKey: "k1",
      }),
      InquiryRateLimitError,
    );
    await assert.rejects(
      repo.createInquiry({
        creatorAccountId: "creator", senderName: "Ada", senderEmail: "ada@example.com",
        topic: "nonsense" as never, message: "Bad topic",
      }),
    );
    assert.equal((await repo.inquiries("creator")).length, 3);
    assert.equal((await repo.inquiries("fan")).length, 0);
    assert.equal((await repo.counts("creator")).inquiries, 3);
    assert.equal(await repo.setInquiryStatus("fan", sent.id, "archived"), false);
    assert.equal(await repo.setInquiryStatus("creator", sent.id, "archived"), true);
    assert.equal((await repo.counts("creator")).inquiries, 2);
  } finally {
    await db.close();
  }
});

test("invitations only cover an organization's own open, published opportunities", async () => {
  const { db, repo } = await setup();
  try {
    const options = await repo.inviteOptions(["org"], "creator");
    assert.deepEqual(options.map((o) => o.opportunityId), ["open-call"]);
    assert.equal(options[0]?.organizationName, "The Quiet Review");
    const base = { creatorAccountId: "creator", organizationId: "org", inviterAccountId: "editor", message: "We'd love to read your work." };
    assert.equal((await repo.createInvitation({ ...base, opportunityId: "other-call" })).status, "unavailable");
    assert.equal((await repo.createInvitation({ ...base, opportunityId: "closed-call" })).status, "unavailable");
    assert.equal((await repo.createInvitation({ ...base, opportunityId: "draft-call" })).status, "unavailable");
    const created = await repo.createInvitation({ ...base, opportunityId: "open-call" });
    assert.equal(created.status, "created");
    assert.equal((await repo.createInvitation({ ...base, opportunityId: "open-call" })).status, "duplicate");
    assert.equal((await repo.inviteOptions(["org"], "creator"))[0]?.invited, true);
    const [invitation] = await repo.invitations("creator");
    assert.equal(invitation?.opportunityTitle, "Spring reading period");
    assert.equal(invitation?.inviterName, "Ede");
    assert.equal(invitation?.open, true);
    assert.equal((await repo.counts("creator")).invitations, 1);
    assert.equal(await repo.setInvitationStatus("creator", invitation!.id, "declined"), true);
    assert.equal((await repo.counts("creator")).invitations, 0);
  } finally {
    await db.close();
  }
});
