import { expect, test } from "@playwright/test";

test("mobile magazine comparison keeps metrics labelled and controls touchable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/rankings/compare?kind=magazines&ids=ploughshares,the-paris-review,kenyon-review",
  );

  const comparison = page.getByRole("region", {
    name: "Magazine comparison",
  });
  await expect(comparison).toBeVisible();
  await expect(comparison.getByRole("article")).toHaveCount(3);
  await expect(
    comparison.getByText("Anthology accolades").first(),
  ).toBeVisible();
  await expect(comparison.getByText("Contributor pay").first()).toBeVisible();
  await expect(comparison.getByText("Response time").first()).toBeVisible();
  await expect(page.locator("table")).toBeHidden();

  const remove = comparison
    .getByRole("button", { name: /Remove .* from comparison/ })
    .first();
  const removeBox = await remove.boundingBox();
  expect(removeBox?.width).toBeGreaterThanOrEqual(44);
  expect(removeBox?.height).toBeGreaterThanOrEqual(44);
  await remove.click();
  await expect(comparison.getByRole("article")).toHaveCount(2);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();

  await page.screenshot({
    path: "/private/tmp/missa-rankings-comparison-mobile.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("table")).toBeVisible();
  await expect(comparison).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("mobile ranking rows explain component scores before disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rankings/magazines");

  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow.getByText("Anthology honors")).toBeVisible();
  await expect(firstRow.getByText("Contributor pay")).toBeVisible();
  await expect(firstRow.getByText("Response time")).toBeVisible();
});

test("methodology presents the rankings as a limited beta model", async ({
  page,
}) => {
  await page.goto("/rankings/methodology");

  await expect(page.getByText("Method version: 2026 beta")).toBeVisible();
  await expect(
    page.getByText(/These rankings are a testing tool/),
  ).toBeVisible();
  await expect(page.getByText(/objective, transparent/i)).toHaveCount(0);
});
