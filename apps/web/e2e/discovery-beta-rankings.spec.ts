import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`discovery beta and magazine index at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/rankings/magazines");
    await expect(
      page.getByRole("heading", { name: "Rankings" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Missa beta home" }).first(),
    ).toBeVisible();
    await expect(page.getByLabel("Find a magazine")).toBeVisible();
    await expect(page.getByLabel("Ranking tier")).toBeVisible();
    await page.getByLabel("Find a magazine").fill("zzzz-no-magazine-exists");
    await expect(
      page.getByText("No magazines found", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("No magazines found", { exact: true }),
    ).toHaveCount(0);
    const next = page.getByRole("button", { name: "Next", exact: true });
    if (await next.count()) {
      await next.click();
      await expect(page.getByText(/Page 2 of/)).toBeVisible();
      await page.getByRole("button", { name: "Previous", exact: true }).click();
    }
    await page
      .getByRole("navigation", { name: "Ranking genre" })
      .getByRole("link", { name: "Poetry", exact: true })
      .click();
    await expect(page).toHaveURL(/genre=poetry/);
    await expect(
      page
        .getByRole("navigation", { name: "Ranking genre" })
        .getByRole("link", { name: "Poetry" }),
    ).toHaveAttribute("aria-current", "page");
    await page.getByLabel("Find a magazine").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Ranking tier")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/private/tmp/missa-rankings-${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page
          .getByRole("navigation", { name: "Mobile navigation" })
          .getByRole("link", { name: "Rankings" }),
      ).toBeVisible();
    }
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Explore", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/private/tmp/missa-beta-home-${width}.png`,
      fullPage: true,
    });
  });
}

import { isDiscoveryBetaPath } from "../lib/discoveryBeta";
test("production discovery gate admits only intended public routes", () => {
  for (const route of [
    "/",
    "/opportunities",
    "/opportunities/a-call",
    "/directory",
    "/discover/poetry",
    "/rankings/magazines",
    "/rankings/residencies",
    "/rankings/compare",
    "/rankings/methodology",
    "/tracker",
    "/calendar",
    "/library",
    "/following",
    "/goals",
    "/inbox",
    "/signup",
    "/onboarding",
  ])
    expect(isDiscoveryBetaPath(route)).toBe(true);
  for (const route of [
    "/workspace",
    "/rankings/plan",
    "/rankings/claim",
    "/opportunities-private",
    "/design-system/creator-workspace",
  ])
    expect(isDiscoveryBetaPath(route)).toBe(false);
});
