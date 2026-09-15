import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = "/design-system/profile-portfolio";

test("profile portfolio uses native lists and named content regions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);

  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Selected Work" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Credits" }).first()).toBeVisible();

  const creditLists = page.locator('ul[class*="credits"]');
  await expect(creditLists.first()).toBeVisible();
  expect(await creditLists.count()).toBeGreaterThan(0);
  for (const list of await creditLists.all()) {
    const children = list.locator(":scope > li");
    expect(await children.count()).toBeGreaterThan(0);
  }

  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("profile portfolio fits mobile, touch, zoom, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  for (const control of await page.locator("main a:visible, main button:visible").all()) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }

  const hiddenCredit = page.getByText("Hidden — only you can see this");
  await expect(hiddenCredit).toBeVisible();
  await expect(hiddenCredit.locator("xpath=ancestor::*[contains(@class, 'hiddenCredit')][1]")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.getByText(/Owner only · handle not claimed/)).toBeVisible();

  const motionSample = page.locator('[class*="motionSample"]').first();
  await page.getByRole("button", { name: "Publish sample" }).click();
  expect(
    await motionSample.locator('[class*="textSample"]').evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(
    0.001,
  );

  const mobileAudit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(mobileAudit.violations).toEqual([]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
