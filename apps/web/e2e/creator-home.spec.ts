import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Relational only: Home is derived from account-backed Tracker state.
const opportunityId = "opp_story-16-2-e2e";
const title = "Story 16.2 Browser Fixture";

test("Home is derived from Tracker state and every row opens the record", async ({ page }) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `home-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "correct-horse-battery",
      givenName: "Ifeoma",
      familyName: "Home",
    },
  });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  await page.context().addCookies([{ name: "missa_session", value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: "Lax" }]);

  // A new creator is sent from the old workspace entry to Home.
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hello, Ifeoma." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your week starts with one saved call" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true }).first()).toHaveAttribute("aria-current", "page");

  const save = await page.request.post("/api/me/tracker", { data: { opportunityId } });
  expect([200, 201]).toContain(save.status());
  const detail = (await (await page.request.get(`/api/me/applications/${opportunityId}`)).json()) as { revision: number };
  const today = new Date().toISOString().slice(0, 10);
  const recorded = await page.request.patch(`/api/me/applications/${opportunityId}`, {
    headers: { "Idempotency-Key": crypto.randomUUID(), "If-Match": String(detail.revision) },
    data: { action: "record", status: "submitted", occurredOn: today, timezone: "UTC", note: "" },
  });
  expect(recorded.ok()).toBeTruthy();

  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "This week’s three" })).toBeVisible();
  const awaiting = page.getByRole("region", { name: /Awaiting responses/ });
  await expect(awaiting.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);

  await awaiting.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(new RegExp(`/tracker\\?application=${opportunityId}`));
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});
