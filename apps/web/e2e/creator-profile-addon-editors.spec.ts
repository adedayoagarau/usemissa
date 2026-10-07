import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The studio editors for Editions, Shows and performances, Services, Teaching
 * and Support. The studio routes below need no database: the sample route seeds
 * a device-only draft, and the plain route starts empty.
 */
const EMPTY = "/design-system/creator-profile-settings";
const SAMPLE = "/design-system/creator-profile-settings?sample=1";
const VIEWPORTS = [
  { width: 1280, height: 900, name: "1280px desktop" },
  { width: 390, height: 844, name: "390px phone" },
] as const;

const rail = (page: Page) =>
  page.getByRole("navigation", { name: "Profile editor" });
const editor = (page: Page) =>
  page.getByRole("region", { name: "Edit section" });
const status = (page: Page) => page.getByRole("status").first();

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}

/** Accessibility of the two panes this work lives in. */
async function expectAccessible(page: Page) {
  const audit = await new AxeBuilder({ page })
    .include('nav[aria-label="Profile editor"]')
    .include('section[aria-label="Edit section"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
}

/** On a phone the section list and the editor are separate views. */
async function showSections(page: Page) {
  const back = editor(page).getByRole("button", { name: "All sections" });
  if (await back.isVisible()) await back.click();
}

async function addAddon(page: Page, name: RegExp) {
  await showSections(page);
  await rail(page).getByRole("button", { name: "Add an add-on" }).click();
  await page.getByRole("menuitem", { name }).click();
}

async function openSection(page: Page, name: RegExp) {
  await showSections(page);
  await rail(page).getByRole("button", { name }).click();
}

/** Wait for the autosave to settle so a reload sees what was typed. */
async function saved(page: Page) {
  await expect(status(page)).toContainText("Saved on this device");
}

/** The live preview: a pane on a desktop, a dialog from the bar on a phone. */
async function expectPreviewShows(page: Page, text: string, shown = true) {
  const phone = (page.viewportSize()?.width ?? 1280) < 1181;
  if (phone)
    await page.getByRole("button", { name: "Preview profile" }).click();
  const preview = phone
    ? page.getByRole("dialog", { name: "Profile preview" })
    : page.getByRole("region", { name: "Live preview" });
  await expect(preview).toBeVisible();
  if (shown) await expect(preview).toContainText(text);
  else await expect(preview).not.toContainText(text);
  if (phone) await page.keyboard.press("Escape");
}

for (const viewport of VIEWPORTS) {
  test(`an add-on is added, filled, counted and previewed, then switched off and back with its data (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(EMPTY);
    await expect(status(page)).toContainText("Saved on this device");

    // Add it. An empty list says what to add and how to start.
    await addAddon(page, /^Editions/);
    await expect(
      editor(page).getByRole("heading", { name: "Editions", level: 2 }),
    ).toBeFocused();
    await expect(editor(page)).toContainText("No editions yet.");
    await showSections(page);
    await expect(
      rail(page).getByRole("button", { name: /^Editions\s*0$/ }),
    ).toBeVisible();
    await expect(rail(page)).toContainText("Add your first edition.");
    await rail(page).getByRole("button", { name: "Add edition" }).click();

    // Fill it. Available can never be more than the edition size.
    await editor(page).getByRole("button", { name: "Add edition" }).click();
    await editor(page)
      .getByLabel("Title", { exact: true })
      .fill("Indigo Hours III");
    await editor(page)
      .getByLabel(/^Medium/)
      .fill("Relief print");
    await editor(page).getByLabel(/^Size/).fill("56 × 76 cm");
    await editor(page).getByLabel(/^Year/).fill("2026");
    await editor(page)
      .getByLabel(/^Edition size/)
      .fill("12");
    await editor(page)
      .getByLabel(/^Available/)
      .fill("40");
    await expect(editor(page).getByLabel(/^Available/)).toHaveValue("12");
    await expect(editor(page)).toContainText("Capped at the edition size, 12.");
    await editor(page)
      .getByLabel(/^Available/)
      .fill("4");
    await editor(page)
      .getByLabel("Image", { exact: true })
      .setInputFiles("public/media/creator-preview-landscape.png");
    await expect(
      editor(page).getByRole("button", { name: "Replace image" }),
    ).toBeVisible();
    await editor(page).getByRole("button", { name: "Done" }).click();
    await expect(editor(page)).toContainText(
      "Relief print · 2026 · 4 of 12 available",
    );
    await expectAccessible(page);

    // The rail counts it, the empty-add-on suggestion is gone, the preview has it.
    await showSections(page);
    await expect(
      rail(page).getByRole("button", { name: /^Editions\s*1$/ }),
    ).toBeVisible();
    await expect(rail(page)).not.toContainText("Add your first edition.");
    await expectPreviewShows(page, "Indigo Hours III");
    await saved(page);

    // Switch it off. It leaves the rail and the preview, and the data stays.
    await openSection(page, /^Editions/);
    await editor(page)
      .getByRole("button", { name: "Switch off editions" })
      .click();
    await showSections(page);
    await expect(
      rail(page).getByRole("button", { name: /^Editions/ }),
    ).toHaveCount(0);
    await expectPreviewShows(page, "Indigo Hours III", false);
    await saved(page);

    // Add it again. What was entered is back, and counted.
    await addAddon(page, /^Editions/);
    await expect(editor(page)).toContainText("Indigo Hours III");
    await expect(editor(page)).toContainText(
      "Relief print · 2026 · 4 of 12 available",
    );
    await showSections(page);
    await expect(
      rail(page).getByRole("button", { name: /^Editions\s*1$/ }),
    ).toBeVisible();
    await expectPreviewShows(page, "Indigo Hours III");
    await expectNoOverflow(page);

    // It survives a reload: the draft is kept on this device.
    await saved(page);
    await page.reload();
    await expect(status(page)).toContainText("Saved on this device");
    await showSections(page);
    await expect(
      rail(page).getByRole("button", { name: /^Editions\s*1$/ }),
    ).toBeVisible();
  });
}

for (const viewport of VIEWPORTS) {
  test(`each editor opens with the sample's entries, with no overflow and no accessibility violations (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(SAMPLE);
    await expect(status(page)).toContainText("Saved on this device");

    const open = async (name: RegExp, heading: string) => {
      await openSection(page, name);
      await expect(
        editor(page).getByRole("heading", { name: heading, level: 2 }),
      ).toBeFocused();
    };
    const firstRow = () =>
      editor(page).locator("ol button[aria-expanded]").first();

    await open(/^Editions/, "Editions");
    await expect(firstRow()).toContainText("Indigo Hours III");
    await firstRow().click();
    await expect(editor(page).getByLabel(/^Edition size/)).toHaveValue("12");
    await expect(editor(page).getByLabel(/^Available/)).toHaveValue("4");
    await expectAccessible(page);
    await expectNoOverflow(page);

    await open(/^Shows and performances/, "Shows and performances");
    await expect(editor(page).locator("ol > li")).toHaveCount(3);
    await firstRow().click();
    await expect(editor(page).getByLabel("Title", { exact: true })).toHaveValue(
      "Indigo Hours",
    );
    await expect(editor(page).getByLabel("Kind")).toHaveValue("solo");
    await expectAccessible(page);
    await expectNoOverflow(page);

    await open(/^Services/, "Services");
    await expect(editor(page).locator("ol > li")).toHaveCount(2);
    await firstRow().click();
    await expect(editor(page).getByLabel(/^Price/)).toHaveValue("On request");
    await expectAccessible(page);
    await expectNoOverflow(page);

    await open(/^Teaching/, "Teaching");
    await firstRow().click();
    await expect(
      editor(page).getByRole("button", { name: /^Date/ }),
    ).toContainText("Mar");
    await expect(editor(page).getByLabel(/^Places left/)).toHaveValue("3");
    await expectAccessible(page);
    await expectNoOverflow(page);

    await open(/^Support/, "Support");
    await expect(editor(page).getByLabel("Link", { exact: true })).toHaveValue(
      "https://example.com/support-riley",
    );
    await expect(editor(page)).toContainText("This link leaves Missa");
    await expectAccessible(page);
    await expectNoOverflow(page);
  });
}

test("a number field takes digits only, never shows NaN and keeps within the limits", async ({
  page,
}) => {
  await page.goto(SAMPLE);
  await openSection(page, /^Editions/);
  await editor(page).locator("ol button[aria-expanded]").first().click();
  const size = editor(page).getByLabel(/^Edition size/);
  const left = editor(page).getByLabel(/^Available/);

  await size.fill("abc");
  await expect(size).toHaveValue("");
  await size.fill("-5");
  await expect(size).toHaveValue("5");
  await size.fill("");
  await expect(size).toHaveValue("");
  await size.fill("999999");
  await expect(size).toHaveValue("100000");
  await expect(editor(page)).toContainText("Capped at 100,000.");
  await expect(editor(page)).not.toContainText("NaN");

  // Lowering the edition size brings what is available down with it.
  await size.fill("20");
  await left.fill("15");
  await size.fill("10");
  await expect(left).toHaveValue("10");
  // Empty means unstated: nothing to cap against, and the row says less.
  await size.fill("");
  await left.fill("500");
  await expect(left).toHaveValue("500");
  await expect(editor(page)).toContainText("500 available");
  // Zero is a number, and says so.
  await left.fill("0");
  await expect(left).toHaveValue("0");
  await expect(editor(page)).toContainText("Reads “Sold out” on your profile.");
  await expect(editor(page)).not.toContainText("NaN");

  // A year takes four digits and is flagged when it stops short.
  const year = editor(page).getByLabel(/^Year/);
  await year.fill("20a2x6y");
  await expect(year).toHaveValue("2026");
  await year.fill("20");
  await year.blur();
  await expect(editor(page)).toContainText("Use four digits, like 2026.");
  await expect(year).toHaveAttribute("aria-invalid", "true");
  await year.fill("2025");
  await expect(editor(page)).not.toContainText("Use four digits");
});

test("a passed teaching date and an unfinished support link are flagged, with a way to fix each", async ({
  page,
}) => {
  await page.goto(SAMPLE);
  await openSection(page, /^Teaching/);
  await editor(page).locator("ol button[aria-expanded]").first().click();

  // Choose a date a year and a half back, from the calendar.
  await editor(page).getByRole("button", { name: /^Date/ }).click();
  for (let month = 0; month < 18; month += 1)
    await page.getByRole("button", { name: /previous month/i }).click();
  await page.getByRole("gridcell").nth(10).getByRole("button").click();
  await expect(editor(page)).toContainText(
    "This date has passed, so the session is hidden from your profile.",
  );
  await expect(editor(page).locator("ol > li").first()).toContainText("Passed");
  await expect(rail(page)).toContainText(
    "1 past teaching session is hidden. Update the date or remove it.",
  );
  // The suggestion leads back to the session. A cleared date never expires.
  await openSection(page, /^Basics/);
  await rail(page)
    .locator("li", { hasText: "past teaching session" })
    .getByRole("button", { name: "Review" })
    .click();
  await expect(
    editor(page).getByRole("heading", { name: "Teaching", level: 2 }),
  ).toBeFocused();
  await editor(page).locator("ol button[aria-expanded]").first().click();
  await editor(page).getByRole("button", { name: /^Date/ }).click();
  await page.getByRole("button", { name: "Clear date" }).click();
  await expect(editor(page)).not.toContainText("This date has passed");
  await expect(rail(page)).not.toContainText("past teaching session");

  // Support: a link that is not a full web address blocks publishing.
  await openSection(page, /^Support/);
  const link = editor(page).getByLabel("Link", { exact: true });
  await link.fill("patreon.com/riley");
  await link.blur();
  await expect(editor(page)).toContainText(
    "Use a full web address, starting with https://",
  );
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await expect(rail(page)).toContainText(
    "Your support link isn’t a full web address.",
  );
  await expectAccessible(page);
  // The fix is one tap from the suggestion, and clears it.
  await openSection(page, /^Basics/);
  await rail(page).getByRole("button", { name: "Fix link" }).click();
  await expect(
    editor(page).getByRole("heading", { name: "Support", level: 2 }),
  ).toBeFocused();
  await link.fill("https://patreon.com/riley");
  await expect(rail(page)).not.toContainText("full web address");
  await expect(editor(page)).not.toContainText("Use a full web address");

  // Switched off, a bad link is not on the profile and cannot block it.
  await link.fill("patreon.com/riley");
  await expect(rail(page)).toContainText("full web address");
  await editor(page)
    .getByRole("button", { name: "Switch off support" })
    .click();
  await expect(rail(page)).not.toContainText("full web address");
});

test("a list stops at its limit, moves rows and undoes a removal", async ({
  page,
}) => {
  await page.goto(SAMPLE);
  await openSection(page, /^Services/);
  const services = editor(page).locator("ol > li");
  await expect(services).toHaveCount(2);

  // Rows move and the first stays first until it is moved.
  await editor(page).getByRole("button", { name: "Move service 2 up" }).click();
  await expect(services.first()).toContainText("Readings and talks");
  await expect(
    editor(page).getByRole("button", { name: "Move service 1 up" }),
  ).toBeDisabled();

  // Remove one, then bring it back where it was.
  await editor(page)
    .getByRole("button", { name: "Remove Commissioned poems" })
    .click();
  await expect(services).toHaveCount(1);
  await expect(editor(page)).toContainText("Removed “Commissioned poems”.");
  await editor(page).getByRole("button", { name: "Undo" }).click();
  await expect(services).toHaveCount(2);
  await expect(services.nth(1)).toContainText("Commissioned poems");

  // Services hold twelve. The add button says so and stops.
  for (let count = 2; count < 12; count += 1)
    await editor(page).getByRole("button", { name: "Add service" }).click();
  await expect(services).toHaveCount(12);
  await expect(
    editor(page).getByRole("button", { name: "Limit of 12 reached" }),
  ).toBeDisabled();
  await expectNoOverflow(page);
});

test("the editors work from the keyboard, including the date calendar", async ({
  page,
}) => {
  await page.goto(EMPTY);
  await addAddon(page, /^Teaching/);
  await editor(page).getByRole("button", { name: "Add session" }).focus();
  await page.keyboard.press("Enter");
  const title = editor(page).getByLabel("Title", { exact: true });
  await title.focus();
  await page.keyboard.type("Relief printing, two days");
  await page.keyboard.press("Tab");
  // The date is a button that opens a calendar.
  const date = editor(page).getByRole("button", { name: /^Date/ });
  await expect(date).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid")).toBeVisible();
  // The calendar opens on its month buttons; Tab reaches the days.
  for (let step = 0; step < 4; step += 1) {
    const inDays = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="grid"]')),
    );
    if (inDays) break;
    await page.keyboard.press("Tab");
  }
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid")).toHaveCount(0);
  await expect(date).toBeFocused();
  await expect(date).not.toContainText("No date");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Lisbon");
  await page.keyboard.press("Tab");
  await page.keyboard.type("3");
  await expect(editor(page).getByLabel(/^Places left/)).toHaveValue("3");
  await expect(editor(page).locator("ol > li").first()).toContainText(
    "3 places left",
  );
});
