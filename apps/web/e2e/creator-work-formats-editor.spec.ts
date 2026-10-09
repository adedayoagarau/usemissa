import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The format fields in the studio's work editor: the wall label once there is
 * an image, a film on request, chapters and a transcript once there is audio
 * or a film, and a case study for the Design lens or on request.
 */

const rail = (page: Page) =>
  page.getByRole("navigation", { name: "Profile editor" });
const editor = (page: Page) =>
  page.getByRole("region", { name: "Edit section" });

async function openNewWork(page: Page) {
  await page.goto("/design-system/creator-profile-settings");
  await rail(page)
    .getByRole("button", { name: /^Selected work/ })
    .click();
  await editor(page).getByRole("button", { name: "Add work" }).click();
  await editor(page).getByLabel("Title", { exact: true }).fill("A test work");
}

test("a poem's row stays short: formats appear only when they apply", async ({
  page,
}) => {
  await openNewWork(page);
  const form = editor(page);
  await form
    .getByLabel(/^Text/)
    .fill(
      "Ebb: what the water owes the shore.\nNeap: a month that forgets to pull.",
    );
  for (const name of [
    "Wall label",
    "Film",
    "Chapters and transcript",
    "Case study",
  ])
    await expect(form.getByRole("group", { name })).toHaveCount(0);
  // The two on-request groups are one line of buttons.
  await expect(
    form.getByRole("button", { name: "Add a film link" }),
  ).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Add case study details" }),
  ).toBeVisible();
});

test("an image brings the wall label, with a live preview of its caption", async ({
  page,
}) => {
  await openNewWork(page);
  const form = editor(page);
  await form
    .getByLabel("Image", { exact: true })
    .setInputFiles("public/media/creator-preview-landscape.png");
  const label = form.getByRole("group", { name: "Wall label" });
  await expect(label).toBeVisible();
  await form.getByLabel("Year").fill("2025");
  await label.getByLabel(/^Series/).fill("Indigo Hours");
  await label.getByLabel(/^Medium/).fill("Relief print on Kozo paper");
  await label.getByLabel(/^Size/).fill("56 × 76 cm");
  await label.getByLabel(/^Edition/).fill("Edition of 12");
  await expect(label).toContainText(
    "On your profile: A test work, 2025 · Relief print on Kozo paper · 56 × 76 cm · Edition of 12",
  );
  await expect(label).toContainText(
    "Works with the same series name sit together under a heading on your profile.",
  );
});

test("audio brings chapters and a transcript, and a time that isn't mm:ss is flagged and not saved", async ({
  page,
}) => {
  await openNewWork(page);
  const form = editor(page);
  await form
    .getByLabel("Audio", { exact: true })
    .setInputFiles("public/media/sample-tone.wav");
  const group = form.getByRole("group", { name: "Chapters and transcript" });
  await expect(group).toBeVisible();
  await expect(group).toContainText("No chapters yet.");

  await group.getByRole("button", { name: "Add chapter" }).click();
  const time = group.getByLabel("Time");
  await group.getByLabel(/^Title/).fill("The rope");

  // The row's summary button; the Remove button shares the chapter's name.
  const row = group.locator("button[aria-expanded]").first();
  await time.fill("9.40");
  await expect(time).toHaveAttribute("aria-invalid", "true");
  await expect(group).toContainText(
    "Use minutes and seconds, like 09:40. This time isn’t saved yet.",
  );
  // The row's summary shows the last time that is really a time: none yet.
  await expect(row).not.toContainText("9.40");

  await time.fill("03:12");
  await expect(time).not.toHaveAttribute("aria-invalid", "true");
  await expect(group).not.toContainText("isn’t saved yet");
  await expect(row).toContainText("03:12");

  await time.fill("1:02:30");
  await expect(row).toContainText("1:02:30");

  await group
    .getByLabel("Transcript")
    .fill("[Gulls. A boat engine idles.]\nHANS: Half the town has forgotten.");
  await expect(group.getByLabel("Transcript")).toHaveValue(/Half the town/);
});

test("a film link is added on request, and says what a visitor will get", async ({
  page,
}) => {
  await openNewWork(page);
  const form = editor(page);
  await form.getByRole("button", { name: "Add a film link" }).click();
  const film = form.getByRole("group", { name: "Film" });
  const link = film.getByLabel(/^Film link/);
  await expect(link).toBeFocused();
  await expect(
    form.getByRole("button", { name: "Add a film link" }),
  ).toHaveCount(0);
  await expect(film).toContainText("only after a visitor presses play");

  await link.fill("https://youtu.be/M7lc1UVf-VE");
  await expect(film).toContainText(
    "YouTube link recognized. Nothing loads from YouTube until a visitor presses play.",
  );
  await expect(film).toContainText(
    "Add an image above to use as the film’s poster.",
  );

  await link.fill("https://vimeo.com/123456789/a1b2c3d4e5");
  await expect(film).toContainText("Vimeo link recognized.");

  await link.fill("https://example.com/film");
  await expect(film).toContainText(
    "isn’t a YouTube or Vimeo link, so it opens as an ordinary link in a new tab.",
  );

  await link.fill("javascript:alert(1)");
  await expect(film).toContainText("Use a full link beginning with https://");

  // A film has chapters and a transcript too.
  await link.fill("https://youtu.be/M7lc1UVf-VE");
  await expect(
    form.getByRole("group", { name: "Chapters and transcript" }),
  ).toBeVisible();
});

test("case-study fields are on request, and open for the Design lens", async ({
  page,
}) => {
  await openNewWork(page);
  const form = editor(page);
  await form.getByRole("button", { name: "Add case study details" }).click();
  const study = form.getByRole("group", { name: "Case study" });
  await expect(study.getByLabel(/^Brief/)).toBeFocused();
  await study
    .getByLabel(/^Brief/)
    .fill("A new identity for a coastal arts festival.");
  await study.getByLabel(/^Your role/).fill("Lead designer");
  await study.getByLabel(/^Outcome/).fill("Launched April 2026");
  await expect(study.getByLabel(/^Outcome/)).toHaveValue("Launched April 2026");

  // With the Design lens chosen, a new work's case-study fields are already open.
  await page.goto("/design-system/creator-profile-settings");
  await rail(page)
    .getByRole("button", { name: /^Appearance/ })
    .click();
  await editor(page)
    .getByRole("button", { name: /^Design/ })
    .click();
  await rail(page)
    .getByRole("button", { name: /^Selected work/ })
    .click();
  await editor(page).getByRole("button", { name: "Add work" }).click();
  await expect(
    editor(page).getByRole("group", { name: "Case study" }),
  ).toBeVisible();
  await expect(
    editor(page).getByRole("button", { name: "Add case study details" }),
  ).toHaveCount(0);
});

test("the format fields fit a phone and pass axe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openNewWork(page);
  const form = editor(page);
  await form
    .getByLabel("Image", { exact: true })
    .setInputFiles("public/media/creator-preview-landscape.png");
  await form
    .getByLabel("Audio", { exact: true })
    .setInputFiles("public/media/sample-tone.wav");
  await form.getByRole("button", { name: "Add a film link" }).click();
  await form.getByRole("button", { name: "Add case study details" }).click();
  await form.getByRole("button", { name: "Add chapter" }).click();
  await form.getByLabel("Time").fill("9.40");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .include('[aria-label="Edit section"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});
