import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/welcome");
});

test("keyboard reveal, repeat, and real destination links", async ({
  page,
}) => {
  const open = page.getByRole("button", { name: "Or, tap to open" });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Begin again" }).click();
  await expect(
    page.getByRole("button", { name: "Open the possibilities" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Or, tap to open" }).click();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find my next step" }),
  ).toHaveAttribute("href", "/onboarding");
  await expect(
    page.getByRole("link", { name: "Explore Missa" }),
  ).toHaveAttribute("href", "/opportunities");
});

test("partial drag springs back; full drags open and close without a second click", async ({
  page,
}) => {
  const surface = page.getByRole("button", { name: "Open the possibilities" });
  const box = (await surface.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 20, { steps: 5 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(surface).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(500);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - box.height * 0.5, { steps: 20 });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(300);
  await page.mouse.move(x, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(x, box.y + box.height * 0.9, { steps: 20 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute("aria-expanded", "false");
});

test("reduced motion settles immediately and has no accessibility violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Or, tap to open" }).click();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toHaveAttribute("aria-expanded", "true");
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations).toEqual([]);
});

test("390px, short viewport, zoom and long copy remain reachable", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 720, height: 500 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Find my next step" })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("link", { name: "Find my next step" }),
    ).toBeVisible();
    if (viewport.width === 390) {
      await page.getByRole("button", { name: "Or, tap to open" }).click();
      await expect(
        page.getByRole("button", { name: "Close the possibilities" }),
      ).toBeVisible();
      await page.waitForTimeout(1700);
      await page.screenshot({
        path: "/private/tmp/missa-welcome-mobile.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Begin again" }).click();
      await expect(
        page.getByRole("button", { name: "Or, tap to open" }),
      ).toBeVisible();
    }
  }
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
    document.querySelector("h1")!.textContent =
      "Make room for every extraordinary thing you have yet to create.";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Find my next step" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Find my next step" }),
  ).toBeInViewport();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "/private/tmp/missa-welcome-zoom.png",
    fullPage: true,
  });
});

test("pointer cancellation and missing artwork keep the scene responsive", async ({
  page,
}) => {
  await page.route("**/media/home/**", (route) => route.abort());
  await page.reload();
  const surface = page.getByRole("button", { name: "Open the possibilities" });
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, {
    steps: 5,
  });
  await surface.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Or, tap to open" }).click();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toBeVisible();
  await expect(page.locator("[data-renderer]")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
});

test("failed graphics and missing images preserve an operable welcome", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl") return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.route("**/media/home/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator("[data-renderer]")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await page.getByRole("button", { name: "Or, tap to open" }).click();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toBeVisible();
  await expect(page.getByText("A new chapter", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find my next step" }),
  ).toBeVisible();
});

test("WebGL context loss falls back and restores without losing the open state", async ({
  page,
}) => {
  await expect(page.locator("[data-renderer]")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  await page.getByRole("button", { name: "Or, tap to open" }).click();
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    const extension = canvas
      .getContext("webgl")!
      .getExtension("WEBGL_lose_context")!;
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 700);
  });
  await expect(page.locator("[data-renderer]")).toHaveAttribute(
    "data-renderer",
    "fallback",
  );
  await expect(page.locator("[data-renderer]")).toHaveAttribute(
    "data-renderer",
    "webgl",
  );
  await expect(
    page.getByRole("button", { name: "Close the possibilities" }),
  ).toBeVisible();
});
