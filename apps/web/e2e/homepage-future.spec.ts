import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route = "/design-system/homepage-future";

test.describe("Gateway + Opportunity Finder homepage review", () => {
  test("keeps each public access state honest", async ({ page }) => {
    for (const mode of ["closed", "waitlist", "open"] as const) {
      await page.goto(`${route}?access=${mode}`);
      const prototype = page.locator("[data-access-mode]").first();
      await expect(prototype).toHaveAttribute("data-access-mode", mode);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: /Find your next opportunity\. Track every application\./i,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          /Search grants, residencies, fellowships, commissions, and open calls\. Manage your deadlines and follow each application from draft to decision\./i,
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: mode === "open" ? "Search open opportunities." : "The opportunity finder.",
        }),
      ).toBeVisible();

      if (mode === "closed") {
        await expect(page.getByTestId("hero-cta")).toHaveAttribute(
          "href",
          "/methodology",
        );
        await expect(
          page.getByRole("link", { name: "Read the methodology" }).first(),
        ).toBeVisible();
        await expect(
          page.locator('a[href="/opportunities"], a[href^="/opportunities/"]'),
        ).toHaveCount(0);
      } else if (mode === "waitlist") {
        await expect(page.getByTestId("hero-cta")).toHaveAttribute(
          "href",
          "/waitlist",
        );
        await expect(
          page.getByRole("link", { name: "Join the waitlist" }).first(),
        ).toBeVisible();
        await expect(
          page.locator('a[href="/opportunities"], a[href^="/opportunities/"]'),
        ).toHaveCount(0);
      } else {
        await expect(page.getByTestId("hero-cta")).toHaveAttribute(
          "href",
          "/opportunities",
        );
        await expect(
          page.getByRole("link", { name: "Browse opportunities" }).first(),
        ).toBeVisible();
        await expect(
          page.getByText("International Writing Fellowship"),
        ).toHaveCount(0);
      }
    }
  });

  test("uses a real catalogue finder without sample content", async ({ page }) => {
    await page.goto(`${route}?access=open`);
    await expect(
      page.getByRole("combobox", { name: "Search by field, organization, or opportunity" }),
    ).toBeVisible();
    await expect(page.getByText("Compare the facts.")).toHaveCount(0);
    await expect(page.getByText("Choose a type or name the field")).toHaveCount(0);
  });

  test("keeps finder controls touch-sized and keyboard-visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?access=open`);
    const grant = page.getByRole("button", { name: "Grant" });
    const grantBox = await grant.boundingBox();
    expect(grantBox?.height).toBeGreaterThanOrEqual(44);

    const search = page.getByRole("combobox", { name: "Search by field, organization, or opportunity" });
    await search.focus();
    await expect(page.locator('[class*="finderSearchLine"]')).toHaveCSS("outline-width", "3px");
  });

  test("previews live matches and preserves catalogue routes", async ({ page }) => {
    await page.route("**/api/opportunities?*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "live-grant",
              slug: "live-grant",
              title: "Live Writing Grant",
              organizationName: "Missa Test Foundation",
              type: "grant",
              deadline: { kind: "exact", date: "2026-10-14" },
            },
          ],
        }),
      });
    });
    await page.goto(`${route}?access=open`);
    const search = page.getByRole("combobox", { name: "Search by field, organization, or opportunity" });
    await search.fill("writing");
    await expect(page.getByRole("option", { name: /Live Writing Grant/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Live Writing Grant/i })).toHaveAttribute(
      "href",
      "/opportunities/live-grant",
    );
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/opportunities\/live-grant$/);
  });

  test("resolves a known creative field before searching", async ({ page }) => {
    let requestUrl = "";
    await page.route("**/api/opportunities?*", async (route) => {
      requestUrl = route.request().url();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });
    await page.goto(`${route}?access=open`);
    await page.getByRole("combobox", { name: "Search by field, organization, or opportunity" }).fill("fiction");
    await expect(page.getByRole("heading", { name: "No results for “fiction”" })).toBeVisible();
    await expect(page.getByText("Clear search", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    const params = new URL(requestUrl).searchParams;
    expect(params.get("taxonomy")).toBeTruthy();
    expect(params.get("q")).toBeNull();
  });

  test("keeps no-JavaScript search submissions functional", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${route}?access=open`);
    await page.getByRole("combobox", { name: "Search by field, organization, or opportunity" }).fill("poetry");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/opportunities\?q=poetry/);
    await context.close();
  });

  test("has no horizontal overflow at review widths", async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${route}?access=open`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test("keeps the hero image and copy available without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto(`${route}?access=open`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Find your next opportunity\. Track every application\./i,
      }),
    ).toBeVisible();

    const hero = page.getByTestId("homepage-hero");
    const image = page.locator('img[src*="missa-cobalt-hero-4k"]');
    await expect(hero).toBeVisible();
    await expect(image).toBeVisible();
    expect(
      await hero.evaluate((element) => element.clientHeight),
    ).toBeGreaterThan(500);
    expect(
      await image.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0,
      ),
    ).toBe(true);

    await context.close();
  });

  test("links only the hero image to scroll progress", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${route}?access=open`);

    const media = page.getByTestId("hero-media");
    const copy = page.getByTestId("hero-copy");
    const before = await media.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        transform: styles.transform,
        filter: styles.filter,
        opacity: Number(styles.opacity),
      };
    });
    const copyBefore = await copy.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return { transform: styles.transform, opacity: Number(styles.opacity) };
    });

    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="homepage-hero"]',
      );
      if (!hero) return;
      window.scrollTo(0, hero.offsetTop + hero.offsetHeight * 0.6);
    });
    await page.waitForTimeout(250);

    const after = await media.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        transform: styles.transform,
        filter: styles.filter,
        opacity: Number(styles.opacity),
      };
    });
    const copyAfter = await copy.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return { transform: styles.transform, opacity: Number(styles.opacity) };
    });

    expect(after.transform).not.toBe(before.transform);
    expect(before.filter).toBe("none");
    expect(after.filter).toBe("none");
    expect(after.opacity).toBeLessThan(before.opacity);
    expect(copyAfter.transform).not.toBe(copyBefore.transform);
    expect(copyAfter.opacity).toBeLessThan(copyBefore.opacity);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Find your next opportunity\. Track every application\./i,
      }),
    ).toBeVisible();
  });

  test("passes automated accessibility checks on phone and desktop", async ({
    page,
  }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${route}?access=open`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, `${width}px accessibility violations`).toEqual(
        [],
      );
    }
  });

  test("renders immediately when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${route}?access=open`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Find your next opportunity\. Track every application\./i,
      }),
    ).toBeVisible();
    await expect(page.getByTestId("hero-media")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    await expect(page.getByTestId("hero-media")).toHaveCSS("transform", "none");
    await expect(page.getByTestId("hero-media")).toHaveCSS("filter", "none");
    await expect(page.getByTestId("hero-media")).toHaveCSS("opacity", "1");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
  });

  test("shows an explicitly labelled example tracker when signed out", async ({
    page,
  }) => {
    await page.goto(`${route}?access=open`);

    const board = page.getByRole("region", { name: /Every application/i });
    await expect(
      board.getByText("Example record — sign in to see your real applications."),
    ).toBeVisible();
    await expect(board.getByText("North River Review")).toBeVisible();
  });

  test("exposes accessible tab semantics and arrow-key navigation", async ({
    page,
  }) => {
    await page.goto(`${route}?access=open`);

    const tablist = page.getByRole("tablist", { name: "Tracker status" });
    await expect(tablist).toBeVisible();
    const activeTab = page.getByRole("tab", { name: "Active" });
    await activeTab.focus();
    await expect(activeTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Submitted" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await expect(page.locator(".trackerCard, [class*='trackerCard']")).toHaveCSS(
      "opacity",
      "1",
    );
  });
});
