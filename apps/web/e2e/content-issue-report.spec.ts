import { expect, test } from "@playwright/test";

test("signed-out visitors are asked to log in before reporting", async ({ page }) => {
  await page.goto("/journal/cincinnati-review");
  await page.getByRole("button", { name: "Report incorrect information" }).click();
  await expect(page.getByRole("dialog")).toContainText("Log in so we can keep your report");
  await expect(page.getByRole("link", { name: "Log in to report" })).toHaveAttribute(
    "href",
    /next=%2Fjournal%2Fcincinnati-review/,
  );
});

test("a creator can send a journal correction to the review queue", async ({ page }) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `content-report-${Date.now()}@example.com`,
      password: "correct-horse-battery",
      displayName: "Correction Reporter",
    },
  });
  expect(signup.status()).toBe(201);

  await page.goto("/journal/cincinnati-review");
  await page.getByRole("button", { name: "Report incorrect information" }).click();
  await page.getByLabel("What is incorrect?").selectOption("ranking-data");
  await page.getByLabel("What should it say?").fill("The listed score should be checked against the current methodology data.");
  await page.getByLabel("Official supporting URL").fill("https://www.cincinnatireview.com/");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("status")).toHaveText("Thanks. We’ll review this.");
});
