import { expect, test } from "@playwright/test";

test("homepage opportunity entry points use the catalogue route", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", {
      name: "Opportunities",
      exact: true,
    }),
  ).toHaveAttribute("href", "/opportunities");
  await expect(
    page.getByRole("link", { name: /See all .* open opportunities|Open the full catalogue/ }),
  ).toHaveAttribute("href", "/opportunities");
  await expect(
    page
      .getByRole("navigation", { name: "Homepage footer navigation" })
      .getByRole("link", { name: "Opportunities", exact: true }),
  ).toHaveAttribute("href", "/opportunities");

  await page
    .getByRole("link", { name: /See all .* open opportunities|Open the full catalogue/ })
    .click();
  await expect(page).toHaveURL(/\/opportunities$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next opportunity." }),
  ).toBeVisible({ timeout: 30_000 });
});

test("mobile homepage menu opens the opportunities catalogue", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Opportunities", exact: true })
    .click();
  await expect(page).toHaveURL(/\/opportunities$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next opportunity." }),
  ).toBeVisible({ timeout: 30_000 });
});
