import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LANDMARK_RULES = [
  "bypass",
  "landmark-one-main",
  "landmark-unique",
  "region",
];

test("country and login routes expose one usable main landmark", async ({
  page,
}) => {
  for (const path of ["/countries/ng", "/login"]) {
    await page.goto(path);
    await expect(page.locator("main#main-content")).toHaveCount(1);

    const audit = await new AxeBuilder({ page })
      .withRules(LANDMARK_RULES)
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});

test("public country and organization routes state their actual scope", async ({
  page,
}) => {
  await page.goto("/countries/ng");
  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(
    primaryNavigation.getByRole("link", { name: "Directory", exact: true }),
  ).toHaveAttribute("href", "/directory");
  await expect(
    primaryNavigation.getByRole("link", {
      name: "For organizations",
      exact: true,
    }),
  ).toHaveAttribute("href", "/for-organizations");
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }),
  ).toHaveAttribute("href", "/signup");
  await expect(
    page.getByRole("heading", { name: "Nigeria and worldwide listings" }),
  ).toBeVisible();
  await expect(page.getByText(/Inclusion does not confirm eligibility/)).toBeVisible();
  await expect(page.getByText(/open to writers in Nigeria/i)).toHaveCount(0);

  await page.goto("/organizations");
  await expect(
    page.getByRole("heading", { name: "Explore visual arts organizations." }),
  ).toBeVisible();
  await expect(page.getByText(/wider organization directory/)).toBeVisible();
});

test("public browse labels persist and interactive filters meet the touch target", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/opportunities");
  await expect(page.getByText("Search opportunities", { exact: true })).toBeVisible();
  expect(await page.locator("article h2").count()).toBeGreaterThan(0);

  await page.goto("/journals");
  await expect(page.getByText("Search organizations", { exact: true })).toBeVisible();
  const filterTargets = await page
    .getByRole("navigation", { name: "Reading window filters" })
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
  expect(filterTargets.length).toBeGreaterThan(0);
  expect(filterTargets.every((height) => height >= 44)).toBeTruthy();
});

test("mobile opportunity action names its external destination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/opportunities");
  const firstOpportunityHref = await page.locator("article h2 a").first().getAttribute("href");
  expect(firstOpportunityHref).toBeTruthy();
  await page.goto(firstOpportunityHref!);

  await expect(
    page.getByRole("link", { name: "Open official site" }),
  ).toBeVisible();
});

test("mobile public navigation keeps both account entry points", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/countries/ng");
  await page.getByRole("button", { name: "Open navigation" }).click();

  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(
    navigation.getByRole("link", { name: "For organizations", exact: true }),
  ).toHaveAttribute("href", "/for-organizations");
  await expect(
    navigation.getByRole("link", { name: "Create account", exact: true }),
  ).toHaveAttribute("href", "/signup");
});
