import { expect, test } from "@playwright/test";

test("homepage opportunity entry points use the catalogue route", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator(".missa-homepage-hero img")).toHaveAttribute(
    "src",
    /hero-artist-studio\.webp/,
  );

  await expect(
    page.getByRole("link", { name: "Browse opportunities", exact: true }).first(),
  ).toHaveAttribute("href", "/opportunities");
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link", {
      name: "Opportunities",
      exact: true,
    }),
  ).toHaveAttribute("href", "/opportunities");
  await expect(
    page.getByRole("link", { name: "Browse all calls", exact: true }),
  ).toHaveAttribute("href", "/opportunities");
  await expect(
    page
      .getByRole("navigation", { name: "Homepage footer navigation" })
      .getByRole("link", { name: "Opportunities", exact: true }),
  ).toHaveAttribute("href", "/opportunities");

  await page
    .getByRole("link", { name: "Browse opportunities", exact: true })
    .first()
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
  await page.getByRole("button", { name: "Open menu" }).click();

  const wordmark = page
    .locator('[aria-labelledby="homepage-hero-heading"]')
    .getByRole("link", { name: "Missa beta home" });
  const closeButton = page.getByRole("button", { name: "Close menu" });
  const [wordmarkBox, closeButtonBox] = await Promise.all([
    wordmark.boundingBox(),
    closeButton.boundingBox(),
  ]);

  expect(wordmarkBox).not.toBeNull();
  expect(closeButtonBox).not.toBeNull();
  expect(Math.abs(wordmarkBox!.y - closeButtonBox!.y)).toBeLessThanOrEqual(16);

  await page
    .locator("#homepage-hero-menu")
    .getByRole("link", { name: "Opportunities", exact: true })
    .click();
  await expect(page).toHaveURL(/\/opportunities$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next opportunity." }),
  ).toBeVisible({ timeout: 30_000 });
});
