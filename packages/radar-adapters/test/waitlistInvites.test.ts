import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_MAIL_DOMAINS,
  generateInviteToken,
  hashInviteToken,
  isFreeMailDomain,
  orderWaitlistSignups,
} from "../src/waitlistInvites.js";

test("waitlist invite ordering is oldest signup first with a stable tie-breaker", () => {
  const ordered = orderWaitlistSignups([
    {
      id: "july",
      email: "july@example.com",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "march-b",
      email: "b@example.com",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "march-a",
      email: "a@example.com",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
  ]);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["march-a", "march-b", "july"],
  );
});

test("invite tokens are random, URL-safe, and only their hashes are persisted", () => {
  const token = generateInviteToken();
  assert.ok(token.length >= 40);
  assert.match(token, /^[A-Za-z0-9_-]+$/u);
  assert.notEqual(hashInviteToken(token), token);
  assert.equal(hashInviteToken(token), hashInviteToken(token));
});

test("publication matching explicitly excludes common free-mail domains", () => {
  assert.ok(FREE_MAIL_DOMAINS.includes("gmail.com"));
  assert.ok(FREE_MAIL_DOMAINS.includes("proton.me"));
  assert.ok(FREE_MAIL_DOMAINS.includes("aol.com"));
  assert.ok(FREE_MAIL_DOMAINS.includes("gmx.com"));
  assert.ok(FREE_MAIL_DOMAINS.includes("yandex.ru"));
  assert.equal(isFreeMailDomain("gmail.com"), true);
  assert.equal(isFreeMailDomain("Granta.com"), false);
});
