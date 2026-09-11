import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a creator reaches a private workspace after signup", async ({ page }) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `workspace-${Date.now()}@example.com`,
      password: "correct-horse-battery",
      displayName: "Workspace QA",
    },
  });
  expect(signup.status()).toBe(201);

  await page.goto("/home");
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A little progress changes the whole week.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Your work is private here.")).toBeVisible();
});

test("password recovery is generic and invalid links recover safely", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(`missing-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText(/If an account matches/)).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Missing reset token" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request new reset link" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBeFalsy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
