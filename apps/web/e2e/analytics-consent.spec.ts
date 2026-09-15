import { expect, test } from "@playwright/test";

/**
 * Optional analytics is a permission gate, so these specs deliberately start
 * with no stored consent even though the rest of the suite pre-answers it.
 */
test.use({ storageState: { cookies: [], origins: [] } });

function recordAnalyticsEvents(page: import("@playwright/test").Page) {
  const eventNames: string[] = [];
  return {
    eventNames,
    async install() {
      await page.route("**/api/analytics/events", async (route) => {
        const body = route.request().postDataJSON() as { eventName?: string };
        if (body.eventName) eventNames.push(body.eventName);
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ accepted: true }),
        });
      });
    },
  };
}

test("no analytics runs before a choice, and accepting starts it", async ({
  page,
}) => {
  const analytics = recordAnalyticsEvents(page);
  await analytics.install();
  await page.route("**/api/waitlist", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    });
  });

  await page.goto("/waitlist");
  await expect(
    page.getByRole("region", { name: "Analytics consent" }),
  ).toBeVisible();

  await page.getByLabel("Email address").fill("test@example.com");
  expect(analytics.eventNames).toEqual([]);

  await page.getByRole("button", { name: "Accept analytics" }).click();
  await page
    .getByRole("button", { name: "Join the waitlist", exact: true })
    .click();
  await expect
    .poll(() => analytics.eventNames)
    .toEqual(
      expect.arrayContaining([
        "public.waitlist_cta_clicked",
        "public.waitlist_submit_attempted",
      ]),
    );
});

test("declining still lets the product work and writes nothing", async ({
  page,
}) => {
  const analytics = recordAnalyticsEvents(page);
  await analytics.install();
  await page.route("**/api/waitlist", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    });
  });

  await page.goto("/waitlist");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByLabel("Email address").fill("test@example.com");
  await page
    .getByRole("button", { name: "Join the waitlist", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("You’re on the list");
  expect(analytics.eventNames).toEqual([]);
});

test("the decision is remembered and can be reversed from the privacy notice", async ({
  page,
}) => {
  await page.goto("/waitlist");
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(
    page.getByRole("region", { name: "Analytics consent" }),
  ).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("region", { name: "Analytics consent" }),
  ).toHaveCount(0);

  await page.goto("/privacy");
  await expect(page.getByText("Analytics is currently off.")).toBeVisible();
  await page.getByRole("button", { name: "Turn analytics on" }).click();
  await expect(page.getByText("Analytics is currently on.")).toBeVisible();
});
