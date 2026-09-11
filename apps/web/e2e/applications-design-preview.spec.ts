import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const route = "/design-system/applications-v2";
test("confirmation, retry, outcome and undo", async ({ page }) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "View Autumn poetry submissions" })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply on official site" }),
  ).toBeDisabled();
  await page.getByText("Preview controls", { exact: true }).click();
  await page.getByRole("button", { name: "Test a save error" }).click();
  await page.getByRole("button", { name: "I submitted", exact: true }).click();
  await page.getByLabel("Submission date").fill("2026-09-06");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("wasn’t saved");
  await expect(page.getByLabel("Submission date")).toHaveValue("2026-09-06");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: /Awaiting responses/ }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Record outcome" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("tab", { name: /History/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("tab", { name: /Awaiting responses/ }).click();
  await expect(
    page.getByRole("button", { name: "View Autumn poetry submissions" }),
  ).toBeVisible();
  await page.getByLabel("Search applications").fill("nothingmatches");
  await expect(
    page.getByRole("heading", { name: "No matching applications" }),
  ).toBeVisible();
});
test("mobile, keyboard and accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await page.getByRole("tab", { name: /^Saved/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: /Awaiting responses/ }),
  ).toBeFocused();
  await page.getByRole("tab", { name: /^Saved/ }).click();
  await page.screenshot({
    path: "outputs/applications-v2-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /View Early-career/ }).click();
  await expect(
    page.getByRole("heading", { name: /Early-career/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((item) =>
      ["critical", "serious"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "I submitted" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "I submitted" })).toBeFocused();
  await page.setViewportSize({ width: 640, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("desktop detail and empty states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(route);
  await page
    .getByRole("button", { name: "View Autumn poetry submissions" })
    .click();
  await page.screenshot({
    path: "outputs/applications-v2-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Set a check-in" }).click();
  await page.getByLabel("Check-in date", { exact: true }).fill("2026-09-10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "No reminder will be sent",
  );
  await page.getByText("Preview controls", { exact: true }).click();
  await page.getByRole("button", { name: "Show empty account" }).click();
  await expect(
    page.getByRole("heading", { name: "Keep your next opportunity here." }),
  ).toBeVisible();
});

test("supporting entry, notes, date correction, archive and loading", async ({
  page,
}) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Add from elsewhere" }).click();
  await page
    .getByLabel("Opportunity title", { exact: true })
    .fill("An independently found call");
  await page
    .getByLabel("Organization", { exact: true })
    .fill("My sample organization");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Add a note" }).click();
  await page
    .getByLabel("Note", { exact: true })
    .fill("Read the guidelines\nChoose two poems");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Read the guidelines/)).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Restore previous stage" }).click();
  await expect(page.getByRole("tab", { name: /^Saved/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "I submitted" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Edit submission date" }).click();
  await page.getByLabel("Submission date", { exact: true }).fill("2026-08-31");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Submitted Aug 31, 2026 · Recorded by you"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to applications" }).click();
  await page.getByText("Preview controls", { exact: true }).click();
  await page.getByRole("button", { name: "Show loading" }).click();
  await expect(
    page.getByRole("status", { name: "Loading applications" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Loading applications" }),
  ).not.toBeVisible();
});

test("200 percent zoom retains usable layout", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await page.getByRole("button", { name: /View Early-career/ }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "outputs/applications-v2-zoom.png",
    fullPage: true,
  });
});

test("shared navigation and meaningful row labels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(route);
  await expect(
    page.getByRole("link", { name: "My applications", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "View Autumn poetry submissions" }),
  ).toContainText("Closing soon");
  await page.getByRole("tab", { name: /Awaiting responses/ }).click();
  await expect(
    page.getByRole("button", { name: "View New voices award" }),
  ).toContainText("In review");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Opportunities", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Library", exact: true }),
  ).toHaveAttribute("href", "/library");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});
