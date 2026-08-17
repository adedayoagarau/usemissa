import { expect, test } from "@playwright/test";

test("superseded Profile review routes lead to the current public and portfolio reviews", async ({
  page,
}) => {
  await page.goto("/design-system/profile");
  await expect(page).toHaveURL(/\/design-system\/profile-public$/u);
  await expect(
    page.getByRole("heading", { name: "Amaka Obi", level: 1 }),
  ).toBeVisible();

  await page.goto("/design-system/profile-directions");
  await expect(page).toHaveURL(/\/design-system\/profile-portfolio$/u);
  await expect(
    page.getByRole("heading", { name: "Fixture coverage", level: 2 }),
  ).toBeVisible();
  await expect(page.locator("[data-fixture]")).toHaveCount(16);
});
