import { expect, test, type Page } from "@playwright/test";

/**
 * Public pages are served from the CDN, so the site header learns who is
 * signed in from the browser. These specs start without a session.
 */
test.use({ storageState: { cookies: [], origins: [] } });

function countSessionChecks(page: Page) {
  const checks = { count: 0 };
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/me") checks.count += 1;
  });
  return checks;
}

const accountMenu = (page: Page, email: string) =>
  page.getByRole("button", { name: `Open account menu for ${email}` });

test("visitors who never signed in get the public header without a session check", async ({
  page,
}) => {
  const checks = countSessionChecks(page);
  await page.goto("/about", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("banner").getByRole("link", { name: "Log in" }),
  ).toBeVisible();
  expect(checks.count).toBe(0);
  expect(
    await page.evaluate(() =>
      document.documentElement.hasAttribute("data-signed-in"),
    ),
  ).toBe(false);
});

test("signed-in people see their account on public pages, and logging out clears it", async ({
  page,
}) => {
  const email = `header-${Date.now()}@example.com`;
  await page.goto("/signup?next=/opportunities");
  await page.getByLabel("Given name").fill("Alex");
  await page.getByLabel("Family name").fill("Morgan");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toBe("/opportunities");

  await page.goto("/about");
  await expect(accountMenu(page, email)).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Log in" }),
  ).toHaveCount(0);

  // On a fresh load the signed-out actions are hidden before first paint.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as Window & { __signedInAtLoad?: boolean }).__signedInAtLoad =
        document.documentElement.hasAttribute("data-signed-in");
    });
  });
  const checks = countSessionChecks(page);
  await page.goto("/methodology");
  await expect(accountMenu(page, email)).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __signedInAtLoad?: boolean }).__signedInAtLoad,
    ),
  ).toBe(true);
  expect(checks.count).toBe(1);

  await page.goto("/about");
  await accountMenu(page, email).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toBe("/login");

  await page.goto("/about", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Log in" }),
  ).toBeVisible();
  await expect(accountMenu(page, email)).toHaveCount(0);
});
