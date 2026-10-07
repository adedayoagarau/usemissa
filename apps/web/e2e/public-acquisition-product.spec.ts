import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const bannedPublicCopy =
  /source snapshot|next refresh|freshness signal|profile completeness|\bverified\b/iu;

test("public Home leads with useful Opportunities and no operational theatre", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find your next open call.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Open opportunities" }).getByRole("article").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse open calls" }).first(),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(bannedPublicCopy);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("selected public pages keep evidence language customer-safe", async ({
  page,
}) => {
  for (const path of ["/about", "/methodology", "/discover/grants"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(bannedPublicCopy);
    await expect(
      page.getByRole("link", { name: "Missa beta home" }).first(),
    ).toBeVisible();
  }
  await page.goto("/methodology");
  await expect(
    page.getByRole("heading", { name: "Each fact on its own." }),
  ).toBeVisible();
  await expect(page.getByText("Listed isn’t the same as guaranteed")).toBeVisible();
});

test("For Organizations distinguishes available, limited, and planned capability", async ({
  page,
}) => {
  await page.goto("/for-organizations");
  await expect(
    page.getByRole("heading", {
      name: "Run your open call without enterprise software.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Limited", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Planned", { exact: true })).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText(
    /132 submissions|emails queued|Northline Arts Foundation/iu,
  );
});

test("the retired waitlist leads to sign-up and keeps campaign tags", async ({
  page,
}) => {
  await page.goto("/waitlist?utm_source=bedside&utm_campaign=public-redesign");
  await expect(page).toHaveURL(
    /\/signup\?utm_source=bedside&utm_campaign=public-redesign$/u,
  );
  await page.goto("/thank-you?source=waitlist");
  await expect(page).toHaveURL(/\/signup\?source=waitlist$/u);
});

test("public crawler surface exposes the launched product", async ({ request }) => {
  const [robotsResponse, sitemapResponse, llmsResponse] = await Promise.all([
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/llms.txt"),
  ]);
  expect(robotsResponse.ok()).toBeTruthy();
  expect(sitemapResponse.ok()).toBeTruthy();
  expect(llmsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  const sitemap = await sitemapResponse.text();
  const llms = await llmsResponse.text();
  expect(robots).toContain("User-Agent: OAI-SearchBot");
  expect(robots).toContain("Allow: /");
  expect(robots).not.toMatch(/^Disallow: \/$/m);
  expect(sitemap).toContain("<sitemapindex");
  expect(sitemap).toContain("/sitemap-pages.xml");
  expect(llms).toContain(
    "Missa is a free site where artists and writers find open calls, grants, residencies, magazines and prizes",
  );
  expect(llms).toContain("official source");
});

test("public system reflows cleanly at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/methodology",
    "/discover/residencies",
    "/for-organizations",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      `${path} overflowed`,
    ).toBeTruthy();
    await expect(
      page.getByRole("button", { name: /Open (?:navigation|menu)/u }),
    ).toBeVisible();
  }
  await page.goto("/");
  await page.screenshot({
    path: "outputs/public-product-home-mobile.png",
    fullPage: true,
  });
});
