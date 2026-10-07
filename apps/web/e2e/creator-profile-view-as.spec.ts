import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const studio = "/design-system/creator-profile-settings?sample=1";

test("View as shows what each kind of viewer can do, and sends nothing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(studio);
  const preview = page.getByRole("region", { name: "Live preview" });
  const viewAs = preview.getByLabel("View as");
  await expect(viewAs).toHaveValue("visitor");

  const touch = preview.getByRole("button", {
    name: "Get in touch",
    exact: true,
  });
  const follow = preview.getByRole("button", { name: "Follow", exact: true });
  const credit = preview.getByRole("button", {
    name: "Credit as collaborator",
  });
  const invite = preview.getByRole("button", { name: "Invite to apply" });
  const edit = preview.getByRole("button", { name: "Edit profile" });
  const notice = preview.getByRole("status").filter({ hasText: /\S/ });

  // A visitor can write and follow, and nothing else.
  await expect(touch).toBeVisible();
  await expect(follow).toBeVisible();
  await expect(credit).toHaveCount(0);
  await expect(invite).toHaveCount(0);
  await expect(edit).toHaveCount(0);

  // Another creator can also credit this creator.
  await viewAs.selectOption("creator");
  await expect(credit).toBeVisible();
  await expect(invite).toHaveCount(0);
  await credit.click();
  await expect(notice).toContainText("Both of you confirm before it shows");

  // An organization can invite to an open call; a preview never opens the form.
  await viewAs.selectOption("organization");
  await expect(invite).toBeVisible();
  await expect(credit).toHaveCount(0);
  await invite.click();
  await expect(notice).toContainText("Nothing is sent from a preview");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The owner sees a way back to editing, and no Follow or Get in touch.
  await viewAs.selectOption("owner");
  await expect(edit).toBeVisible();
  await expect(follow).toHaveCount(0);
  await expect(touch).toHaveCount(0);
  await edit.click();
  await expect(notice).toContainText("already editing");

  // Back to a visitor restores the first set.
  await viewAs.selectOption("visitor");
  await expect(touch).toBeVisible();
  await expect(edit).toHaveCount(0);

  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("the phone preview dialog shows the visitor's actions and closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(studio);
  await page.getByRole("button", { name: "Preview profile" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The dialog is the visitor's view; View as lives in the desktop preview bar.
  await expect(
    dialog.getByRole("button", { name: "Get in touch", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
