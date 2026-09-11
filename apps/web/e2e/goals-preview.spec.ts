import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("create and check in without inventing submissions", async ({ page }) => {
  await page.goto("/design-system/goals");
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  await page.getByLabel("Goal name").fill("Submit six essays");
  await page.getByLabel("Number of submissions").fill("6");
  await page.getByLabel("First small step").fill("Revise an essay");
  await page.getByRole("button", { name: "Create goal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Submit six essays" }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page
    .getByLabel("Your next step", { exact: true })
    .fill("Read the guidelines");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(
    page.getByText("Read the guidelines", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause goal" }).click();
  await expect(
    page.getByRole("button", { name: "Check in", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume goal" }).click();
  await expect(
    page.getByRole("button", { name: "Check in", exact: true }),
  ).toBeEnabled();
});
test("mobile recurring goal and accessibility", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system/goals");
  await page.getByLabel("Choose a goal").selectOption("2");
  await expect(page.getByText(/Next dates unconfirmed/)).toBeVisible();
  await page.getByText("Reminders & recommendations", {exact:true}).click();
  await page.getByLabel("Use this goal to tailor suggestions").uncheck();
  await page
    .getByRole("button", { name: "Stop following this program" })
    .click();
  await expect(page.getByText(/Goal-based suggestions are off/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({ path: "outputs/goals-mobile.png", fullPage: true });
});
test("desktop preview", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/design-system/goals");
  await page.screenshot({ path: "outputs/goals-desktop.png", fullPage: true });
});

test("goal dialog keyboard return and text reflow", async ({page}) => {
 await page.setViewportSize({width:640,height:450});await page.goto("/design-system/goals");await page.evaluate(()=>document.documentElement.style.fontSize="200%");await page.getByRole("button",{name:"New goal",exact:true}).click();await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"New goal",exact:true})).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
