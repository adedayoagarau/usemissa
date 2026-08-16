import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`portfolio review renders all sixteen contract fixtures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-system/profile-portfolio");

    const fixtures = page.locator("[data-fixture]");
    await expect(fixtures).toHaveCount(16);
    expect(
      await fixtures.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-fixture")),
      ),
    ).toEqual(
      Array.from({ length: 16 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ),
    );

    for (const fixture of await fixtures.all()) {
      await expect(fixture).toBeVisible();
      const box = await fixture.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThan(0);
      expect(box?.height ?? 0).toBeGreaterThan(0);

      const directChildren = fixture.locator(":scope > *");
      await expect(directChildren).toHaveCount(2);
      const headingBox = await directChildren.nth(0).boundingBox();
      const previewBox = await directChildren.nth(1).boundingBox();
      expect(headingBox).not.toBeNull();
      expect(previewBox).not.toBeNull();
      expect(
        (headingBox?.y ?? 0) + (headingBox?.height ?? 0),
      ).toBeLessThanOrEqual((previewBox?.y ?? 0) + 1);
    }

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

  test(`public Profile keeps its reading path and Share menu at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-system/profile-public");

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Get in touch" }),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Share" })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Links", exact: true }),
    ).toBeVisible();
    const websiteLink = page.getByRole("link", { name: "Website", exact: true });
    const instagramLink = page.getByRole("link", {
      name: "Instagram",
      exact: true,
    });
    const linkedinLink = page.getByRole("link", {
      name: "LinkedIn",
      exact: true,
    });
    await expect(websiteLink).toBeVisible();
    await expect(instagramLink).toBeVisible();
    await expect(linkedinLink).toBeVisible();
    await expect(websiteLink).toHaveAttribute(
      "rel",
      "nofollow ugc noopener noreferrer",
    );
    const [websiteBox, instagramBox] = await Promise.all([
      websiteLink.boundingBox(),
      instagramLink.boundingBox(),
    ]);
    expect(websiteBox).not.toBeNull();
    expect(instagramBox).not.toBeNull();
    expect(Math.abs((websiteBox?.y ?? 0) - (instagramBox?.y ?? 0))).toBeLessThan(
      4,
    );
    expect(websiteBox?.width ?? Infinity).toBeLessThan(180);
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

test("Profile social preview uses the production image renderer", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/profile-social-card");

  await expect(
    page.getByRole("heading", {
      name: "What appears when a Profile is shared",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Social preview for Amaka Obi's public Profile.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  const image = await request.get(
    "/design-system/profile-social-card/opengraph-image",
  );
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect((await image.body()).byteLength).toBeGreaterThan(10_000);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("owner Profile uses safe mobile Work and photo controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let requestedHandle: Record<string, unknown> | undefined;
  await page.route("**/api/me/handles", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    requestedHandle = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "renamed",
        handle: {
          handleKey: "amaka-obi",
          displayHandle: "amaka-obi",
          state: "claimed",
          claimedAt: "2026-08-15T00:00:00.000Z",
        },
      }),
    });
  });
  await page.goto("/design-system/profile-owner");

  await expect(
    page.getByRole("button", { name: "Change photo" }),
  ).toBeVisible();
  const ownerPortrait = await page
    .locator('[data-slot="avatar"]')
    .boundingBox();
  const photoAction = await page
    .getByRole("button", { name: "Change photo" })
    .boundingBox();
  expect(ownerPortrait).not.toBeNull();
  expect(photoAction).not.toBeNull();
  expect(
    Math.abs((ownerPortrait?.y ?? 0) - (photoAction?.y ?? 0)),
  ).toBeLessThanOrEqual(4);
  await expect(page.getByLabel("Photo link")).toHaveCount(0);
  await expect(page.getByLabel("Link type").first()).toBeVisible();
  await expect(page.getByLabel("URL").first()).toBeVisible();
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
  await expect(
    page.getByRole("switch", {
      name: "Allow messages through your Profile",
    }),
  ).toBeChecked();

  await expect(page.getByLabel("Handle")).toBeEditable();
  await page.getByLabel("Handle").fill("amaka-obi");
  await page.getByRole("button", { name: "Rename handle" }).click();
  await expect(
    page.getByText("Your Profile is now at @amaka-obi.", { exact: true }),
  ).toBeVisible();
  expect(requestedHandle).toEqual({ handle: "amaka-obi" });
  await expect(
    page.getByRole("link", { name: /View as visitor/u }),
  ).toHaveAttribute("href", "/@amaka-obi");

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

test("leaving the owner editor removes an unpublished draft photo", async ({
  page,
}) => {
  const draftPhotoUrl =
    "https://example.public.blob.vercel-storage.com/missa/profiles/profile-amaka/draft-photo.webp";
  let deletedPhotoUrl: string | undefined;

  await page.route("**/api/me/profile/photo", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ url: draftPhotoUrl }),
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      deletedPhotoUrl = (route.request().postDataJSON() as { url?: string })
        .url;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ removed: true }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/design-system/profile-owner");
  await page.getByLabel("Profile photo").setInputFiles({
    name: "profile-photo.webp",
    mimeType: "image/webp",
    buffer: Buffer.from("profile-photo"),
  });
  await expect(page.getByText("Photo added to this draft.")).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect.poll(() => deletedPhotoUrl).toBe(draftPhotoUrl);
});

test("owner claims a handle in place before first publish", async ({
  page,
}) => {
  let requestedHandle: Record<string, unknown> | undefined;
  await page.route("**/api/me/handles", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requestedHandle = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        state: "claimed",
        handle: {
          handleKey: "amaka-first",
          displayHandle: "amaka-first",
          state: "claimed",
          claimedAt: "2026-08-15T00:00:00.000Z",
        },
      }),
    });
  });

  await page.goto("/design-system/profile-owner?handle=none");
  await page.getByLabel("Name").fill("Amaka Obi first");
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(
    page.getByText("Claim a handle before publishing your Profile.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByLabel("Handle").fill("amaka-first");
  await page.getByRole("button", { name: "Claim handle" }).click();
  await expect(
    page.getByText("Your Profile is now at @amaka-first.", { exact: true }),
  ).toBeVisible();
  expect(requestedHandle).toEqual({ handle: "amaka-first" });
});

test("public Profile contact keeps the creator email private", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/profile/profile-amaka/contact", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true }),
    });
  });

  await page.goto("/design-system/profile-public");
  await page.getByRole("button", { name: "Get in touch" }).click();
  await expect(
    page.getByRole("heading", { name: "Get in touch with Amaka Obi" }),
  ).toBeVisible();
  await page.getByLabel("Your name").fill("Tomi Adeyemi");
  await page.getByLabel("Your email").fill("tomi@example.com");
  await page
    .getByLabel("Message")
    .fill("I would like to discuss an essay commission with you.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("heading", { name: "Message sent." }),
  ).toBeVisible();

  expect(submitted).toMatchObject({
    senderName: "Tomi Adeyemi",
    senderEmail: "tomi@example.com",
  });
  expect(String(submitted?.idempotencyKey)).toHaveLength(36);
  expect(JSON.stringify(submitted)).not.toContain("amaka@example.com");
});
