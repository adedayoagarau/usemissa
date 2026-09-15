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
  assert.ok(
    rendered.html.includes(
      "Your account is ready, and we’re glad you’re here.",
    ),
  );
  assert.ok(
    rendered.html.includes("compare open calls from around the world."),
  );
  assert.ok(rendered.html.includes("Browse opportunities"));
  assert.ok(rendered.html.includes("/media/missa-bosphorus-poster.jpg"));
  assert.doesNotMatch(
    rendered.html,
    /Getting started|Here is how|Visit your profile|Unsubscribe|worth your time|endless/iu,
  );
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
