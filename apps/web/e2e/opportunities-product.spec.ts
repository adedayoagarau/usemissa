import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("canonical Opportunities browse", () => {
  test("is public and exposes only customer-safe source attribution", async ({
    page,
    request,
  }) => {
    const response = await page.goto("/opportunities");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Opportunities" }),
    ).toBeVisible();
    expect(await page.locator("article").count()).toBeGreaterThan(0);
    await expect(
      page.getByText(
        /Fresh source|Recently checked|Source confidence|Last successful check/i,
      ),
    ).toHaveCount(0);

    const apiResponse = await request.get("/api/opportunities?limit=1");
    expect(apiResponse.ok()).toBeTruthy();
    const payload = (await apiResponse.json()) as {
      items: Array<{ source: Record<string, unknown> }>;
    };
    expect(Object.keys(payload.items[0]?.source ?? {}).sort()).toEqual([
      "kind",
      "name",
      "url",
    ]);
  });

  test("uses the selected catalogue at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/opportunities");
    await expect(
      page.getByRole("heading", { level: 2, name: "Search filters" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Opportunity type" }),
    ).toBeVisible();
    await expect(page.getByText("All fields", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Sort by")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBeFalsy();
  });

  test("uses a mobile filter sheet and remains accessible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/opportunities");
    await expect(
      page.getByRole("heading", { level: 2, name: "Search filters" }),
    ).toBeHidden();
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Filter opportunities" }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("More category filters"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBeFalsy();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("button", { name: /^Filters/ })).toBeFocused();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
  });

  for (const width of [320, 390, 900, 1440]) {
    test(`does not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/opportunities?sort=recently-added");
      await expect(page.getByRole("heading", { level: 1, name: "Opportunities" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
    });
  }
});

test.describe("canonical Opportunity detail", () => {
  const slug = "north-river-review-call-for-submissions";

  test("is public, canonical, and contains no operational evidence copy", async ({
    page,
  }) => {
    const response = await page.goto(`/opportunities/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "North River Review — Call for Submissions",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Official source" }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Fresh source|Recently checked|Source confidence|Last successful check|organization confirmed/i,
      ),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Save .* privately/ }),
    ).toBeVisible();
  });

  test("redirects the legacy discover URL to the canonical detail", async ({
    page,
  }) => {
    await page.goto(`/discover/opportunities/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/opportunities/${slug}$`));
  });

  test("is responsive and accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/opportunities/${slug}`);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBeFalsy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
  });
});

test.describe("Save-to-Tracker authentication return", () => {
  const slug = "north-river-review-call-for-submissions";

  test("preserves a private Save intent through login and opens the exact Tracker item", async ({
    page,
  }) => {
    await page.goto(`/opportunities/${slug}`);
    await page.getByRole("button", { name: /Save .* privately/ }).click();
    await expect(page).toHaveURL(/\/signup\?next=.*north-river-review/);
    expect(new URL(page.url()).searchParams.has("intent")).toBeFalsy();
    await expect(
      page.getByText("North River Review — Call for Submissions", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Saving does not confirm eligibility or send an application/,
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Log in", exact: true }).click();

    await page.getByLabel("Email address").fill("ada@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("poetry-and-fiction");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(
      page.getByRole("heading", {
        name: /Opportunity saved privately|Already in your Tracker/,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Open Tracker/ }).click();
    await expect(page).toHaveURL(/\/tracker$/);
    await expect(
      page
        .getByRole("heading", {
          name: "North River Review — Call for Submissions",
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByText("Next useful action")).toBeVisible();
  });

  test("drops unsafe return paths and never reconstructs Save state from a URL", async ({
    page,
  }) => {
    await page.goto(
      `/login?next=${encodeURIComponent("https://example.com")}&intent=${encodeURIComponent("save://example.com")}`,
    );
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    await expect(page.getByText("Private Save")).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("intent")).toBe(
      "save://example.com",
    );
  });
});
