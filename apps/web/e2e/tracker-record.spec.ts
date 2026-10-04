import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Relational only: the application record needs account storage.
const opportunityId = "opp_story-16-2-e2e";
const title = "Story 16.2 Browser Fixture";

async function creatorWithSavedCall(page: Page) {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `record-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "correct-horse-battery",
      givenName: "Record",
      familyName: "Tester",
    },
  });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{
    name: "missa_session",
    value: sessionCookie!,
    url: new URL(signup.url()).origin,
    httpOnly: true,
    sameSite: "Lax",
  }]);
  const save = await page.request.post("/api/me/tracker", { data: { opportunityId } });
  expect([200, 201]).toContain(save.status());
}

test("a Tracker deep link opens the sheet with its record, and opening the official application never records a submission", async ({ page }) => {
  await creatorWithSavedCall(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/tracker?application=${opportunityId}`);

  const record = page.getByRole("dialog");
  await expect(record.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  await expect(record.getByRole("heading", { name: "Start preparing" })).toBeVisible();
  await expect(record.getByRole("heading", { name: "Where this stands" })).toBeVisible();

  const official = record.getByRole("link", { name: /Official application/ });
  await expect(official).toBeVisible();
  await expect(record.getByText("Opening the official application never marks it submitted.", { exact: false })).toBeVisible();
  const popup = page.waitForEvent("popup");
  await official.click();
  await (await popup).close();
  const before = await page.request.get(`/api/me/applications/${opportunityId}`);
  expect(((await before.json()) as { myStatus: string }).myStatus).not.toBe("submitted");

  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);

  await record.getByRole("button", { name: "Record submission" }).first().click();
  const recordDialog = page.getByRole("dialog", { name: "Record your submission" });
  await recordDialog.getByLabel("Evidence (optional)").fill("Confirmation number E2E-1");
  await recordDialog.getByRole("button", { name: "Record submission" }).click();
  await expect(recordDialog).toHaveCount(0);
  await expect(record.getByText("Recorded by you").first()).toBeVisible();
  await record.getByRole("heading", { name: "What has been recorded" }).scrollIntoViewIfNeeded();
  await expect(record.getByText("Confirmation number E2E-1")).toBeVisible();
  const after = await page.request.get(`/api/me/applications/${opportunityId}`);
  expect(((await after.json()) as { myStatus: string }).myStatus).toBe("submitted");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).not.toHaveURL(/application=/);
});

test("a section link scrolls the sheet to reminders at phone width without horizontal scroll", async ({ page }) => {
  await creatorWithSavedCall(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/tracker?application=${opportunityId}&section=timing`);
  const record = page.getByRole("dialog");
  await expect(record.getByText("Preparation reminder", { exact: true })).toBeInViewport();
  await expect(record.getByText("Response check-in", { exact: true })).toBeVisible();
  await expect(record.getByText("Starts after you record a submission")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: "outputs/tracker-record-mobile.png", fullPage: false });
});
