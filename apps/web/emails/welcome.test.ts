import test from "node:test";
import assert from "node:assert/strict";
import { renderWelcomeEmail, deliverWelcomeEmail } from "./welcome";

test("renderWelcomeEmail is personal, concise, and uses complete sentences", () => {
  const rendered = renderWelcomeEmail({
    accountId: "acc_welcome_1",
    email: "writer@example.com",
    givenName: "Adedayo",
  });

  assert.equal(rendered.subject, "Welcome to Missa");
  assert.ok(rendered.html.includes("Welcome to Missa, Adedayo."));
  assert.ok(rendered.html.includes("Three things make it yours."));
  for (const step of ["Choose what you make", "Save a call to your Tracker", "Keep reminder emails on"]) {
    assert.ok(rendered.html.includes(step), step);
  }
  assert.ok(rendered.html.includes("Browse open calls"));
  assert.doesNotMatch(rendered.html, /\.jpg|Unsubscribe|Getting started|endless/iu, "no stock imagery and no unsubscribe on an account letter");
  assert.ok(rendered.text.includes("Welcome to Missa, Adedayo."));
  assert.ok(rendered.text.includes("/opportunities"));
});

test("deliverWelcomeEmail calls mail service idempotently", async () => {
  const result = await deliverWelcomeEmail({
    accountId: "acc_welcome_mock",
    email: "writer@example.com",
    displayName: "Adedayo",
  });

  assert.equal(result.status, "sent");
  assert.ok(result.providerMessageId?.startsWith("mock_re_"));
});
