import { expect, test, type Page } from "@playwright/test";

async function createAccount(page: Page) {
  const email = `contact-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password: "correct-horse-battery",
      displayName: "Contact Test User",
    },
  });
  expect(signup.status()).toBe(201);
  const owner = await page.request.get("/api/me/profile");
  expect(owner.ok()).toBeTruthy();
  return (await owner.json()) as { id: string };
}

function message(overrides: Record<string, unknown> = {}) {
  return {
    senderName: "A Reader",
    senderEmail: `reader-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    message: "I would like to discuss a commission for your writing.",
    idempotencyKey: `contact-${Date.now()}-reader`,
    ...overrides,
  };
}

test("Profile contact is opt-in, validated, and fails closed without delivery", async ({
  page,
}) => {
  const profile = await createAccount(page);
  const endpoint = `/api/profile/${profile.id}/contact`;
  const headers = {
    "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  };

  const disabled = await page.request.post(endpoint, { headers, data: message() });
  expect(disabled.status()).toBe(404);
  expect(await disabled.json()).toEqual({
    error: "Contact is unavailable for this Profile.",
  });

  const published = await page.request.patch("/api/me/profile/public", {
    data: {
      displayName: "Contact Test User",
      contactEnabled: true,
      socialLinks: [],
      selectedWorks: [],
    },
  });
  expect(published.ok()).toBeTruthy();

  const invalid = await page.request.post(endpoint, {
    headers,
    data: message({ senderEmail: "not-an-email" }),
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({
    error: "Enter a valid email address.",
    field: "senderEmail",
  });

  const unavailable = await page.request.post(endpoint, { headers, data: message() });
  expect(unavailable.status()).toBe(503);
  expect(await unavailable.json()).toEqual({
    error: "We could not send your message. Try again.",
  });

  const honeypot = await page.request.post(endpoint, {
    headers,
    data: message({ website: "https://spam.example" }),
  });
  expect(honeypot.status()).toBe(202);
  expect(await honeypot.json()).toEqual({ accepted: true });
});
