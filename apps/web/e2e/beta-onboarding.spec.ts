import { test, expect } from "@playwright/test";

test("onboarding persists, and failed saves keep the current step", async ({
  page,
}) => {
  const email = `beta-setup-${Date.now()}@example.com`;
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password: "correct-horse-battery",
      givenName: "Beta",
      familyName: "QA",
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "What do you make?" }),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: "Writing" }).click();
  await page.route("**/api/me/onboarding", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "We could not save this change. Please try again." },
    }),
  );
  await page.getByRole("button", { name: "Finish later" }).click();
  await expect(
    page.getByText("We could not save this change. Please try again."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.unroute("**/api/me/onboarding");
  await page.getByRole("button", { name: "Finish later" }).click();
  await expect(page).toHaveURL(/\/tracker$/);

  // A skipped setup resumes with its saved choices instead of claiming that
  // setup is complete.
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "What do you make?" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Writing" })).toBeChecked();
});
