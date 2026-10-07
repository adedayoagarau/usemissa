import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const studio = "/design-system/creator-profile-settings?sample=1";

async function openWork(page: Page, title: RegExp | string) {
  const rail = page.getByRole("navigation", { name: "Profile editor" });
  const editor = page.getByRole("region", { name: "Edit section" });
  await rail.getByRole("button", { name: /^Selected work/ }).click();
  await editor.getByRole("button", { name: title }).first().click();
  return editor;
}

async function openPageFields(page: Page, title: RegExp | string) {
  const editor = await openWork(page, title);
  const trigger = editor.getByRole("button", { name: /^Page for this work/ });
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  return { editor, trigger };
}

test("a work's page group shows its address live and says when it can't be used", async ({
  page,
}) => {
  await page.goto(studio);
  const { editor, trigger } = await openPageFields(
    page,
    /^An atlas of small departures/,
  );
  // The address comes from the title until the creator chooses one.
  await expect(trigger).toContainText(
    "usemissa.com/@rileychen/an-atlas-of-small-departures",
  );
  const address = editor.getByLabel(/^Page address/);
  await address.fill("My Atlas, 2026!");
  await expect(editor.getByText(/^Page:/)).toContainText(
    "usemissa.com/@rileychen/my-atlas-2026",
  );
  await expect(trigger).toContainText("usemissa.com/@rileychen/my-atlas-2026");
  // A trailing hyphen can be typed on the way to the next word.
  await address.fill("my-atlas-");
  await address.pressSequentially("two");
  await expect(editor.getByText(/^Page:/)).toContainText("/my-atlas-two");

  // Missa uses some words itself.
  await address.fill("cv");
  const note = editor
    .getByRole("status")
    .filter({ hasText: /^(?!$).*(is used by Missa|is already the address)/ });
  await expect(note).toContainText(
    "“cv” is used by Missa, so this page is at usemissa.com/@rileychen/an-atlas-of-small-departures",
  );
  await address.fill("atlas");
  await expect(note).toHaveCount(0);

  // Another work can't take an address a work already has.
  await editor
    .getByRole("button", { name: /^An atlas of small departures/ })
    .first()
    .click();
  await editor.getByRole("button", { name: /^Tidal glossary/ }).click();
  await editor.getByRole("button", { name: /^Page for this work/ }).click();
  await editor.getByLabel(/^Page address/).fill("atlas");
  await expect(note).toContainText(
    "“atlas” is already the address of “An atlas of small departures”, so this page is at usemissa.com/@rileychen/tidal-glossary",
  );
});

test("the page's context, credits and rights are saved with the work", async ({
  page,
}) => {
  await page.goto(studio);
  const { editor } = await openPageFields(page, /^Tidal glossary/);
  await editor
    .getByLabel(/^About this work/)
    .fill("Written on the pier.\n\nSecond paragraph.");
  await editor.getByLabel(/^Made during/).fill("A residency by the sea");
  await editor.getByLabel(/^Supported by/).fill("Coastline Arts Fund");
  await editor.getByLabel(/^Rights line/).fill("CC BY-NC 4.0");

  const credits = editor.getByRole("group", { name: "Credits" });
  await credits.getByRole("button", { name: "Add a credit" }).click();
  await credits.getByLabel(/^Role/).fill("Editor");
  await credits.getByLabel(/^Name/).fill("Mara Lind");
  await credits.getByLabel(/^Link/).fill("https://example.com/mara");
  await credits.getByRole("button", { name: "Done" }).click();
  await expect(
    credits.getByRole("button", { name: /^Mara Lind/ }),
  ).toContainText("Editor");

  // The draft is kept on this device, so it is all there after a reload.
  await expect(page.getByRole("status").first()).toContainText(
    "Saved on this device",
  );
  await page.reload();
  const again = await openPageFields(page, /^Tidal glossary/);
  await expect(again.editor.getByLabel(/^About this work/)).toHaveValue(
    "Written on the pier.\n\nSecond paragraph.",
  );
  await expect(again.editor.getByLabel(/^Rights line/)).toHaveValue(
    "CC BY-NC 4.0",
  );
  await expect(
    again.editor
      .getByRole("group", { name: "Credits" })
      .getByRole("button", { name: /^Mara Lind/ }),
  ).toBeVisible();
});

test("parts are added, ordered, switched between kinds and removed with undo", async ({
  page,
}) => {
  await page.goto(studio);
  const { editor } = await openPageFields(page, /^Tidal glossary/);
  const parts = editor.getByRole("group", { name: "Parts" });
  await expect(parts).toContainText("No parts yet.");

  await parts.getByRole("button", { name: "Add a part" }).click();
  await parts.getByLabel(/^Title/).fill("Ebb");
  await parts.getByLabel(/^Text/).fill("What the water owes the shore.");
  await parts.getByLabel(/^Note/).fill("Written at low tide.");
  await parts.getByRole("button", { name: "Done" }).click();

  await parts.getByRole("button", { name: "Add a part" }).click();
  // A new part is open; it starts as text, and the other kinds bring their own fields.
  await parts.getByLabel("What kind of part").selectOption("image");
  await expect(parts.getByRole("button", { name: /^Add image/ })).toBeVisible();
  await expect(parts.getByLabel(/^Text/)).toHaveCount(0);
  await parts.getByLabel("What kind of part").selectOption("audio");
  await expect(
    parts.getByRole("button", { name: /^Add recording/ }),
  ).toBeVisible();
  await parts.getByLabel(/^Title/).fill("Tide table, read aloud");
  await parts.getByRole("button", { name: "Done" }).click();

  const items = parts.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Ebb");
  await expect(items.nth(1)).toContainText("Tide table, read aloud");

  // Reordering uses the same move controls as every other list.
  await parts.getByRole("button", { name: "Move part 2 up" }).click();
  await expect(items.nth(0)).toContainText("Tide table, read aloud");
  await expect(
    parts.getByRole("button", { name: "Move part 1 up" }),
  ).toBeDisabled();

  await parts.getByRole("button", { name: "Remove Ebb" }).click();
  await expect(items).toHaveCount(1);
  await expect(parts.getByRole("status")).toContainText("Removed “Ebb”.");
  await parts.getByRole("button", { name: "Undo" }).click();
  await expect(items).toHaveCount(2);
  await expect(items.nth(1)).toContainText("Ebb");
});

test("an image part asks for its description once a picture is added", async ({
  page,
}) => {
  await page.goto(studio);
  const { editor } = await openPageFields(page, /^Tidal glossary/);
  const parts = editor.getByRole("group", { name: "Parts" });
  await parts.getByRole("button", { name: "Add a part" }).click();
  await parts.getByLabel("What kind of part").selectOption("image");
  await expect(parts.getByLabel(/^Image description/)).toHaveCount(0);
  await parts
    .getByLabel("Image", { exact: true })
    .setInputFiles("public/media/creator-preview-landscape.png");
  await expect(
    parts.getByRole("button", { name: /^Replace image/ }),
  ).toBeVisible();
  const description = parts.getByLabel(/^Image description/);
  await expect(description).toBeVisible();
  await expect(description).toHaveAttribute("required", "");
  await description.fill("A lake seen through a train window");
  await expect(parts.getByText("Read by screen readers.")).toBeVisible();
});

test("the group opens and closes by keyboard", async ({ page }) => {
  await page.goto(studio);
  const editor = await openWork(page, /^Tidal glossary/);
  const trigger = editor.getByRole("button", { name: /^Page for this work/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

test("an untitled work is told it has no page yet", async ({ page }) => {
  await page.goto("/design-system/creator-profile-settings");
  const rail = page.getByRole("navigation", { name: "Profile editor" });
  const editor = page.getByRole("region", { name: "Edit section" });
  await rail.getByRole("button", { name: /^Selected work/ }).click();
  await editor.getByRole("button", { name: "Add work" }).click();
  await editor.getByRole("button", { name: /^Page for this work/ }).click();
  await expect(
    editor.getByText("Add a title to give this work a page."),
  ).toBeVisible();
  await editor.getByLabel("Title", { exact: true }).fill("A new poem");
  await expect(editor.getByText(/^Page:/)).toContainText(
    "usemissa.com/@yourname/a-new-poem",
  );
  await expect(
    editor.getByText(/your handle is set when you publish/),
  ).toBeVisible();
});

test("the fields are accessible and fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studio);
  const { editor } = await openPageFields(
    page,
    /^An atlas of small departures/,
  );
  const parts = editor.getByRole("group", { name: "Parts" });
  await parts.getByRole("button", { name: "Add a part" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .include('[aria-label="Edit section"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const icon = editor
    .getByRole("button", { name: /^Page for this work/ })
    .locator("svg");
  expect(
    await icon.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.001);
});
