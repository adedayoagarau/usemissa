import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function savedAccount(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post("/api/auth/signup", { data: { email: `saved-${suffix}@example.com`, password: "correct-horse-battery", displayName: "Saved Test User" } });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: "missa_session", value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: "Lax" }]);
  const opportunities = await page.request.get("/api/opportunities?limit=1");
  const opportunity = ((await opportunities.json()) as { items: Array<{ id: string; title: string }> }).items[0]!;
  expect((await page.request.post("/api/me/tracker", { data: { opportunityId: opportunity.id } })).ok()).toBeTruthy();
  return opportunity;
}

test("Saved is a private shortlist backed by Tracker state", async ({ page }) => {
  const opportunity = await savedAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await page.goto("/saved"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Saved" })).toBeVisible();
  await expect(page.getByRole("heading", { name: opportunity.title })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "Saved", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  await page.screenshot({ path: ".impeccable/review/saved-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".impeccable/review/saved-desktop.png", fullPage: true });
});
