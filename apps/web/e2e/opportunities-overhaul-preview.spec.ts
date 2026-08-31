import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  opportunityFixtureScenarios,
  opportunityFixtures,
} from "../components/opportunity-disclosure/fixtures";
import {
  deadlineDisclosure,
  feeDisclosure,
} from "../components/opportunity-disclosure/model";

const route = "/design-system/opportunities-overhaul";

test.describe("Phase 1 opportunity disclosure reference", () => {
  test("the typed fixture matrix covers the accepted disclosure contract", () => {
    const requiredScenarios = [
      "complete",
      "long title",
      "long organization",
      "missing organization",
      "missing deadline",
      "rolling deadline",
      "conflicting deadline",
      "no fee",
      "application fee",
      "missing fee",
      "international",
      "terms",
      "unavailable source",
      "missing image",
      "closed",
      "changed since saved",
      "empty results",
      "loading results",
      "recoverable error",
      "pagination",
      "anonymous action",
      "authenticated action",
    ];
    for (const scenario of requiredScenarios) {
      expect(opportunityFixtureScenarios).toContain(scenario);
    }
    expect(opportunityFixtures).toHaveLength(10);
    expect(deadlineDisclosure({ kind: "conflicting" })).toMatchObject({
      value: "Needs confirmation",
      tone: "warning",
    });
    expect(deadlineDisclosure({ kind: "unknown" })).toMatchObject({
      value: "Not listed",
      tone: "unknown",
    });
    expect(feeDisclosure({ status: "paid", amountCents: 2500, currency: "USD" })).toMatchObject({
      value: "$25",
      tone: "confirmed",
    });
  });

  test("covers browse, search, filters, async states, and source-safe cards", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: "Find the call worth preparing for." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "10 opportunity fixtures" })).toBeVisible();
    await expect(page.getByText("Source: Official organization page").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("processingSucceededAt");
    await expect(page.locator("body")).not.toContainText("checkedAt");
    const search = page.getByRole("searchbox", { name: "Search opportunities" });
    await search.fill("interdisciplinary");
    await expect(page.getByRole("heading", { level: 2, name: "1 opportunity fixture" })).toBeVisible();
    await expect(page.getByRole("link", { name: /International Open Call/ })).toBeVisible();
    await search.fill("");
    await page.getByRole("radio", { name: "Contest" }).check();
    await expect(page.getByRole("heading", { level: 2, name: "1 opportunity fixture" })).toBeVisible();
    await page.getByRole("button", { name: "Loading", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Loading opportunities");
    await page.getByRole("button", { name: "No results" }).click();
    await expect(page.getByRole("heading", { name: "No opportunities match this view" })).toBeVisible();
    await page.getByRole("button", { name: "Recoverable error" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Opportunities could not be loaded" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "1 opportunity fixture" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  });

  test("discloses decision, preparation, terms, uncertainty, and final handoff", async ({ page }) => {
    await page.goto(`${route}?fixture=conflict`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("North River Review");
    await expect(page.getByRole("status")).toContainText("Needs confirmation");
    for (const heading of ["Key facts", "Eligibility", "Required materials", "Terms and submission rules", "Official handoff"]) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByText("AI-assisted work")).toBeVisible();
    await expect(page.getByText("Not listed", { exact: true }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /Read official guidelines/ })).toHaveAttribute("target", "_blank");
    await page.goto(`${route}?fixture=unknowns`);
    await expect(page.getByRole("status")).toContainText("Some details are not listed");
    await expect(page.getByText("Organization not confirmed")).toBeVisible();
    await expect(page.getByText("Required materials are not listed")).toBeVisible();
    await page.goto(`${route}?fixture=closed`);
    await expect(page.getByRole("status")).toContainText("This opportunity is closed");
    await expect(page.getByRole("button", { name: "Save privately" })).toBeDisabled();
  });

  test("uses a focus-managed mobile filter sheet and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const trigger = page.getByRole("button", { name: /^Filters/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Filter opportunities" })).toBeVisible();
    await dialog.getByRole("radio", { name: "Residency" }).check();
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("heading", { level: 2, name: "1 opportunity fixture" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const viewport of [
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-428", width: 428, height: 926 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1280", width: 1280, height: 900 },
    { name: "desktop-1440", width: 1440, height: 1000 },
  ]) {
    test(`${viewport.name} has no browse or detail overflow and no serious accessibility violations`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const url of [route, `${route}?fixture=long-title`]) {
        await page.goto(url);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
      }
    });
  }
});
