import { expect, test } from "@playwright/test";

test.describe("consent and creator mobile remediation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps the consent question bounded at desktop and 200% zoom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system/creator-workspace");

    const consent = page.getByRole("region", { name: "Analytics consent" });
    await expect(consent).toBeVisible();
    await page.getByRole("button", { name: "Accept analytics" }).focus();
    await expect(
      page.getByRole("button", { name: "Accept analytics" }),
    ).toBeFocused();

    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("keeps analytics consent in flow above fixed creator navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-system/creator-workspace");

    const consent = page.getByRole("region", { name: "Analytics consent" });
    const mobileNavigation = page
      .getByRole("navigation", { name: "Creator workspace" })
      .last();

    await expect(consent).toBeVisible();
    await expect(consent).toHaveCSS("position", "relative");
    await expect(mobileNavigation).toBeVisible();

    const [consentBox, navigationBox] = await Promise.all([
      consent.boundingBox(),
      mobileNavigation.boundingBox(),
    ]);
    expect(consentBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(consentBox!.y + consentBox!.height).toBeLessThanOrEqual(
      navigationBox!.y,
    );
    expect(
      await page.evaluate(() => document.body.style.paddingBottom),
    ).toBe("");
  });

  test("keeps portfolio credit actions within the 390px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-system/profile-portfolio");
    await page.getByRole("button", { name: "Show" }).scrollIntoViewIfNeeded();

    for (const control of [
      page.getByRole("button", { name: "Show" }),
      page.getByRole("button", { name: /Add a credit/ }),
      page.getByRole("button", { name: "Save and publish" }),
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("reduces the first onboarding step and preserves creator touch targets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-system/creator-onboarding");

    const firstTile = page.locator("fieldset label").first();
    const tileMedia = firstTile.locator('[class*="aspect-"]').first();
    const mediaBox = await tileMedia.boundingBox();
    expect(mediaBox).not.toBeNull();
    expect(mediaBox!.height / mediaBox!.width).toBeLessThan(0.8);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.goto("/design-system/creator-workspace");
    await page.getByRole("button", { name: "Decline" }).click();
    for (const control of [
      page.getByRole("button", { name: /Continue in Tracker/ }),
      page.getByRole("button", { name: /Open in Tracker/ }).first(),
      page.getByRole("button", { name: "Tracker", exact: true }).last(),
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("uses the canonical creator vocabulary and retires the old applications prototype", async ({
    page,
  }) => {
    await page.goto("/design-system/my-applications");
    await expect(page).toHaveURL(/\/design-system\/tracker-directions$/);

    await page.goto("/design-system/creator-workspace");
    await page.getByRole("button", { name: /Decline/ }).click();
    const navigation = page
      .getByRole("navigation", { name: "Creator workspace" })
      .first();
    await expect(navigation.getByRole("button", { name: "Workspace" })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Tracker" })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Library" })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Calendar" })).toBeVisible();
  });

  test("wraps Tracker and Calendar views inside a 390px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of ["/design-system/tracker", "/design-system/calendar"]) {
      await page.goto(route);
      const viewNavigation = page.getByRole("navigation", {
        name: "Tracker views",
      });
      await expect(viewNavigation).toBeVisible();

      for (const control of await viewNavigation.getByRole("button").all()) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      }

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }

    const filterButtons = page.locator('[class*="filterRow"] button');
    await expect(filterButtons.first()).toBeVisible();
    for (const control of await filterButtons.all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
  });

  test("keeps operational headings distinct from opportunity identity", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of ["/design-system/tracker", "/design-system/calendar"]) {
      await page.goto(route);
      const heading = page.getByRole("heading", { level: 1 });
      const opportunity = page.getByText("North River Review — Call for Submissions").first();
      await expect(heading).toBeVisible();
      await expect(opportunity).toBeVisible();

      const [headingFamily, opportunityFamily] = await Promise.all([
        heading.evaluate((element) => getComputedStyle(element).fontFamily),
        opportunity.evaluate((element) => getComputedStyle(element).fontFamily),
      ]);
      expect(headingFamily).not.toBe(opportunityFamily);
      expect(Number.parseFloat(await opportunity.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
    }
  });
});
