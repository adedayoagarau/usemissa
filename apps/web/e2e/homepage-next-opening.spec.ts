import { test, expect } from "@playwright/test";
import {
  HOMEPAGE_CATEGORIES,
  categorySearch,
} from "../lib/homepage-opportunity-categories";

test("carousel selects each category and exposes its exact search", async ({
  page,
}) => {
  await page.goto("/#next-opening");
  for (const category of HOMEPAGE_CATEGORIES) {
    await page
      .getByRole("button", { name: `Go to ${category.title}`, exact: true })
      .click();
    const link = page.getByRole("button", {
      name: `Browse ${category.title.toLowerCase()}`,
      exact: true,
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      `/opportunities?${categorySearch(category.types)}`,
    );
    await expect(page.locator("#opportunity-categories a:visible")).toHaveCount(
      1,
    );
  }
  await page.getByRole("button", { name: "Previous category" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("heading", { name: "Exhibitions", exact: true }),
  ).toBeVisible();
});

test("mobile swipe, reduced motion, stats and zoom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#next-opening");
  await expect(
    page.getByRole("heading", { name: "Publications", exact: true }),
  ).toBeVisible();
  await page.locator("#opportunity-categories").scrollIntoViewIfNeeded();
  const card = await page
    .locator('#opportunity-categories [data-active="true"]')
    .first()
    .boundingBox();
  if (!card) throw new Error("Active card missing");
  await page.mouse.move(card.x + card.width * 0.8, card.y + 60);
  await page.mouse.down();
  await page.mouse.move(card.x + card.width * 0.2, card.y + 60, { steps: 12 });
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "Prizes", exact: true }),
  ).toBeVisible();

  await expect(
    page.locator("a").filter({ hasText: "Open opportunities ↗" }),
  ).toBeVisible({ timeout: 25000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#opportunity-categories")
    .screenshot({ path: "/tmp/missa-carousel-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({ content: "body {zoom:2}" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed counts never become invented zeros; retry recovers", async ({
  page,
}) => {
  await page.route("**/api/opportunities?**", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/#next-opening");
  await expect(page.getByText("We couldn’t load the totals.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Browse publications" }),
  ).toBeVisible();
  await page.unroute("**/api/opportunities?**");
  await page
    .locator("#next-opening")
    .getByRole("button", { name: "Try again", exact: true })
    .click();
  await expect(
    page.locator("a").filter({ hasText: "Open opportunities ↗" }),
  ).toBeVisible({ timeout: 25000 });
});

test("introduction precedes the carousel", async ({ page }) => {
  await page.goto("/#next-opening");
  const intro = await page.locator("#next-opening").boundingBox();
  const slides = await page.locator("#opportunity-categories").boundingBox();
  expect(intro!.y + intro!.height).toBeLessThanOrEqual(slides!.y + 1);
});

test("horizontal trackpad scrolling moves cards and vertical scrolling stays on the page", async ({
  page,
}) => {
  await page.goto("/#opportunity-categories");
  await expect(page.locator('#next-opening a[href="/directory"]')).toBeVisible({
    timeout: 25000,
  });
  await page.locator("#opportunity-categories").scrollIntoViewIfNeeded();
  const viewport = page.locator(
    '#opportunity-categories [data-slot="carousel-content"]',
  );
  await viewport.hover();
  const startY = await page.evaluate(() => scrollY);
  for (let i = 0; i < 9; i++) {
    await page.mouse.wheel(45, 0);
    await page.waitForTimeout(20);
  }
  await expect(
    page.getByRole("button", { name: "Go to Publications", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(Math.abs((await page.evaluate(() => scrollY)) - startY)).toBeLessThan(
    3,
  );
  await page.mouse.wheel(0, -180);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeLessThan(startY - 40);
  await page
    .getByRole("button", { name: "Go to Festivals", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next category", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Go to Residencies", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("four live metrics include the directory count and fit on mobile", async ({
  page,
  request,
}) => {
  const directory = await (await request.get("/api/journals?limit=1")).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#next-opening");
  const organizations = page.locator('#next-opening a[href="/directory"]');
  await expect(organizations).toContainText(
    `${new Intl.NumberFormat("en").format(directory.total)}+`,
    { timeout: 25000 },
  );
  const metrics = page.locator("#next-opening a strong");
  await expect(metrics).toHaveCount(4);
  for (const number of await metrics.all()) {
    await expect(number).toContainText("+");
    expect(
      await number.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await page
    .locator("#next-opening")
    .screenshot({ path: "/tmp/missa-four-metrics-mobile.png" });
});
