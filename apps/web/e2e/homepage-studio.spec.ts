import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { STUDIO_SCENES, studioHref } from "../lib/homepage-studio";
import { MISSA_TAXONOMY } from "@missa/taxonomy";
import path from "node:path";
const previewPath =
  process.env.HOMEPAGE_STUDIO_PATH ?? "/design-system/homepage-studio";
const evidence = path.resolve(
  process.cwd(),
  "../../docs/homepage-cinematic-2026-09-07/evidence",
);

test("six scenes repeat, hold and close with working discovery navigation", async ({
  page,
}) => {
  await page.goto(previewPath);
  const stage = page.getByTestId("studio-stage");
  await expect(
    page
      .getByRole("link", { name: "Explore opportunities", exact: true })
      .first(),
  ).toHaveAttribute("href", "/opportunities");
  for (let cycle = 0; cycle < 3; cycle++)
    for (const scene of STUDIO_SCENES) {
      await page
        .getByRole("button", { name: scene.label, exact: true })
        .click();
      await expect(stage).toHaveAttribute("data-scene", scene.id);
      await expect(stage).toHaveAttribute("data-busy", "false");
      await expect(stage).toHaveAttribute("data-closed", "false");
      await expect(page.getByRole("img", { name: scene.alt })).toBeVisible();
      await expect(
        page.getByRole("button", { name: scene.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByRole("button", { name: "Close studio", exact: true })
        .click();
      await expect(stage).toHaveAttribute("data-closed", "true");
      await expect(stage).toHaveAttribute("data-busy", "false");
    }
});
test("latest request wins and motion off cancels travel", async ({ page }) => {
  await page.goto(previewPath);
  for (const name of ["Film", "Music", "Design"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("switch", { name: "Scene motion" }).uncheck();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-scene",
    "design",
  );
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-busy",
    "false",
  );
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await page.getByRole("button", { name: "Design", exact: true }).dblclick();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-busy",
    "false",
  );
});
test("missing scene preserves last image and retry recovers", async ({
  page,
}) => {
  await page.route("**/film-*.webp", (route) => route.abort());
  await page.goto(previewPath);
  await page.getByRole("button", { name: "Film", exact: true }).click();
  await expect(page.getByTestId("studio-stage").getByRole("alert")).toContainText("couldn't load");
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-scene",
    "writing",
  );
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-busy",
    "false",
  );
  await page.unroute("**/film-*.webp");
  await page.getByRole("button", { name: "Retry image" }).click();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-scene",
    "film",
  );
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-busy",
    "false",
  );
  await expect(page.getByTestId("studio-stage").getByRole("alert")).toHaveCount(0);
});
test("reduced motion gives stills and preserves keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(previewPath);
  await expect(
    page.getByRole("switch", { name: "Scene motion" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Visual art", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-scene",
    "visual-art",
  );
  await expect(
    page.getByRole("button", { name: "Visual art", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await expect(page.locator("video")).toHaveCount(0);
});
for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
])
  test(`layout and accessibility ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto(previewPath);
    await expect(
      page.getByRole("switch", { name: "Scene motion" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    const box = await page
      .getByRole("link", { name: "Explore opportunities", exact: true })
      .first()
      .boundingBox();
    expect(box!.y + box!.height).toBeLessThan(size.height);
    const results = await new AxeBuilder({ page })
      .include('[data-testid="homepage-studio"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: path.join(evidence, `homepage-${size.width}x${size.height}.png`),
      fullPage: true,
    });
  });
test("mobile menu supports keyboard and focus return", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewPath);
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("practice links use actual canonical families", async ({ page }) => {
  await page.goto(previewPath);
  for (const scene of STUDIO_SCENES) {
    for (const id of scene.taxonomy)
      expect(MISSA_TAXONOMY.terms.find((term) => term.id === id)?.facet).toBe(
        "practice-family",
      );
    await expect(page.locator(`a[href="${studioHref(scene)}"]`)).toHaveCount(1);
  }
});
test("no-JavaScript HTML keeps useful navigation", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:3100${previewPath}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Opportunities",
  );
  await expect(
    page
      .getByRole("link", { name: "Explore opportunities", exact: true })
      .first(),
  ).toHaveAttribute("href", "/opportunities");
  await expect(page.getByRole("img").first()).toBeVisible();
  await context.close();
});
