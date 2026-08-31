import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  OpportunityRepositoryUnavailableError,
  resolveOpportunityRepositoryMode,
} from "../lib/opportunityRepository";
import { resolveOpportunityPresentation } from "../lib/opportunityPresentation";

test.describe("Phase 2 opportunity integration contracts", () => {
  test("presentation rollback is server owned and cannot select repository authority", () => {
    expect(resolveOpportunityPresentation({ NODE_ENV: "production" })).toBe("legacy");
    expect(resolveOpportunityPresentation({ NODE_ENV: "development" })).toBe("disclosure-v2");
    expect(resolveOpportunityPresentation({ NODE_ENV: "production", MISSA_OPPORTUNITIES_PRESENTATION: "disclosure-v2" })).toBe("disclosure-v2");
    expect(resolveOpportunityPresentation({ NODE_ENV: "development", MISSA_OPPORTUNITIES_PRESENTATION: "legacy" })).toBe("legacy");

    const repositoryEnvironment = {
      NODE_ENV: "production",
      MISSA_OPPORTUNITY_REPOSITORY: "postgres",
      DATABASE_URL: "postgres://authority.example/missa",
      MISSA_OPPORTUNITIES_PRESENTATION: "disclosure-v2",
    };
    const legacyRepositoryEnvironment = {
      ...repositoryEnvironment,
      MISSA_OPPORTUNITIES_PRESENTATION: "legacy",
    };
    expect(resolveOpportunityRepositoryMode(repositoryEnvironment)).toBe("postgres");
    expect(resolveOpportunityRepositoryMode(legacyRepositoryEnvironment)).toBe("postgres");
  });

  test("production repository configuration fails closed while local compatibility is explicit", () => {
    expect(resolveOpportunityRepositoryMode({ NODE_ENV: "test" })).toBe("compatibility");
    expect(resolveOpportunityRepositoryMode({ NODE_ENV: "development", MISSA_OPPORTUNITY_REPOSITORY: "compatibility" })).toBe("compatibility");
    expect(() => resolveOpportunityRepositoryMode({ NODE_ENV: "production" })).toThrow(OpportunityRepositoryUnavailableError);
    expect(() => resolveOpportunityRepositoryMode({ NODE_ENV: "production", MISSA_OPPORTUNITY_REPOSITORY: "compatibility" })).toThrow(OpportunityRepositoryUnavailableError);
    expect(() => resolveOpportunityRepositoryMode({ NODE_ENV: "test", MISSA_OPPORTUNITY_REPOSITORY: "postgres" })).toThrow(OpportunityRepositoryUnavailableError);
  });

  test("canonical browse and detail are equivalent to their bounded API projections", async ({ page, request }) => {
    const browseResponse = await request.get("/api/opportunities?limit=5");
    expect(browseResponse.status()).toBe(200);
    const browse = await browseResponse.json() as { items: Array<{ id: string; slug: string; title: string; source: Record<string, unknown> }> };
    expect(browse.items.length).toBeGreaterThan(0);
    expect(Object.keys(browse.items[0].source).sort()).toEqual(["kind", "name", "url"]);

    await page.goto("/opportunities");
    await expect(page.locator('[data-opportunity-presentation="disclosure-v2"]')).toBeVisible();
    await expect(page.getByTestId(`opportunity-card-${browse.items[0].slug}`)).toContainText(browse.items[0].title);
    await expect(page.getByRole("button", { name: `Save ${browse.items[0].title} privately` })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/checkedAt|processingSucceededAt|lastCheckedAt/);

    const detailResponse = await request.get(`/api/opportunities/${browse.items[0].slug}`);
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json() as { title: string; source: { url: string }; submissionUrl?: string };
    await page.goto(`/opportunities/${browse.items[0].slug}`);
    await expect(page.locator('[data-opportunity-presentation="disclosure-v2"]')).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: detail.title })).toBeVisible();
    await expect(page.getByRole("link", { name: /Official source/ }).first()).toHaveAttribute("href", detail.source.url);
    if (detail.submissionUrl) {
      await expect(page.getByRole("link", { name: /Open application/ })).toHaveAttribute("href", detail.submissionUrl);
    }
    for (const heading of ["Key facts", "Eligibility", "Required materials", "Terms and submission rules", "Official handoff"]) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain(detail.title);
    expect(jsonLd).not.toMatch(/checkedAt|processingSucceededAt|lastCheckedAt/);
  });

  test("anonymous Save retains the exact canonical return without URL-carried intent", async ({ page }) => {
    await page.goto("/opportunities/north-river-review-call-for-submissions");
    await page.getByRole("button", { name: /Save .* privately/ }).click();
    await expect(page).toHaveURL(/\/signup\?next=.*north-river-review/);
    const destination = new URL(page.url());
    expect(destination.searchParams.get("next")).toBe("/opportunities/north-river-review-call-for-submissions");
    expect(destination.searchParams.has("intent")).toBeFalsy();
    await expect(page.getByText("North River Review — Call for Submissions", { exact: true })).toBeVisible();
  });

  for (const viewport of [
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-428", width: 428, height: 926 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1280", width: 1280, height: 900 },
    { name: "desktop-1440", width: 1440, height: 1000 },
  ]) {
    test(`${viewport.name} keeps canonical browse and detail responsive and accessible`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const route of ["/opportunities", "/opportunities/north-river-review-call-for-submissions"]) {
        await page.goto(route);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
        const audit = await new AxeBuilder({ page }).analyze();
        expect(audit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
      }
    });
  }
});
