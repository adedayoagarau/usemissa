import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`public Profile keeps its reading path and Share menu at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-system/profile-public");

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Share" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Copy link" })).toHaveCount(
      0,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);

    const portrait = await page.locator('[data-slot="avatar"]').boundingBox();
    expect(portrait).not.toBeNull();
    if (width === 390) {
      expect(Math.round(portrait?.width ?? 0)).toBe(70);
      expect(Math.round(portrait?.height ?? 0)).toBe(88);
    }

    await page.getByRole("button", { name: "Share" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Copy link" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "WhatsApp" }),
    ).toBeVisible();
  });
}

test("owner Profile uses safe mobile Work and photo controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/profile-owner");

  await expect(
    page.getByRole("button", { name: "Change photo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Photo link")).toHaveCount(0);
  await expect(page.getByText("Featured", { exact: true })).toHaveCount(1);
  await expect(
    page.locator('[data-slot="collapsible-content"]:visible'),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Remove The Harmattan Year" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Remove this Work from your Profile?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("alertdialog")).not.toBeVisible();

  await page.getByLabel("Name").fill("Amaka Obi refined");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Discard these Profile changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByLabel("Name")).toHaveValue("Amaka Obi refined");

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("owner Profile keeps all Work editors open on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/design-system/profile-owner");
  await expect(
    page.locator('[data-slot="collapsible-content"]:visible'),
  ).toHaveCount(2);
});
