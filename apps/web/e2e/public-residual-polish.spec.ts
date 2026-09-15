import { expect, test } from "@playwright/test";

test("country directory explains language and geographic overlap", async ({
  page,
}) => {
  await page.goto("/countries");

  const languageCollection = page.getByRole("heading", {
    name: "English-language publishing hubs",
  });
  await expect(languageCollection).toBeVisible();
  await expect(
    page.getByText(
      "A language-based collection. Countries may also appear in their geographic region below.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Africa" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^South Africa:/ }),
  ).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(languageCollection).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("residency meters avoid layout motion and remain visible with reduced motion", async ({
  page,
}) => {
  await page.goto("/rankings/residencies");

  const firstScoreButton = page
    .getByRole("button", { name: /^(Score breakdown|Breakdown)$/ })
    .first();
  await expect(firstScoreButton).toBeVisible();
  await firstScoreButton.click();

  const meter = page.locator('[class*="meterFill"]').first();
  await expect(meter).toBeVisible();
  await expect
    .poll(() => meter.evaluate((element) => getComputedStyle(element).width))
    .not.toBe("0px");
  expect(
    await meter.evaluate((element) => getComputedStyle(element).transitionProperty),
  ).not.toContain("width");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page
    .getByRole("button", { name: /^(Score breakdown|Breakdown)$/ })
    .first()
    .click();
  const reducedMotionMeter = page.locator('[class*="meterFill"]').first();
  await expect(reducedMotionMeter).toBeVisible();
  expect(
    await reducedMotionMeter.evaluate(
      (element) => getComputedStyle(element).transitionProperty,
    ),
  ).not.toContain("width");
});
