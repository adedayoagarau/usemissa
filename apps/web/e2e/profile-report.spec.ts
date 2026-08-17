import { expect, test, type Page } from "@playwright/test";

async function createPublishedProfile(page: Page) {
  const email = `profile-report-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password: "correct-horse-battery",
      displayName: "Report Test User",
    },
  });
  expect(signup.status()).toBe(201);
  const owner = await page.request.get("/api/me/profile");
  expect(owner.ok()).toBeTruthy();
  const profile = (await owner.json()) as { id: string };
  const published = await page.request.patch("/api/me/profile/public", {
    data: {
      displayName: "Report Test User",
      oneLine: "A public Profile used to test private reports.",
      socialLinks: [],
      selectedWorks: [],
    },
  });
  expect(published.ok()).toBeTruthy();
  return profile;
}

test("public Profile reports validate, stay private, and fail closed without durable storage", async ({
  page,
}) => {
  const profile = await createPublishedProfile(page);
  const endpoint = `/api/profile/${profile.id}/report`;
  const headers = {
    "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
  };

  const invalid = await page.request.post(endpoint, {
    headers,
    data: { idempotencyKey: crypto.randomUUID() },
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({
    error: "Choose a reason for your report.",
    field: "reason",
  });

  const unavailable = await page.request.post(endpoint, {
    headers,
    data: { reason: "spam", idempotencyKey: crypto.randomUUID() },
  });
  expect(unavailable.status()).toBe(503);
  expect(await unavailable.json()).toEqual({
    error: "We could not send your report. Try again.",
  });

  const honeypot = await page.request.post(endpoint, {
    headers,
    data: { website: "https://spam.example" },
  });
  expect(honeypot.status()).toBe(202);
  expect(await honeypot.json()).toEqual({ accepted: true });

  const publicProjection = await page.request.get(`/api/profile/${profile.id}`);
  const publicBody = JSON.stringify(await publicProjection.json());
  expect(publicBody).not.toContain("profile_issue");
  expect(publicBody).not.toContain("reporter");
});
