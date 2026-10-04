import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const work = (page: Page) =>
  page.getByRole("region", { name: "Selected work" }).locator("article");

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}

async function expectAccessible(page: Page, include = "main") {
  const audit = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
}

test("public profile leads with the featured work, filters by format and explains provenance", async ({
  page,
}) => {
  await page.goto("/design-system/creator-profile-v2");
  await expect(
    page.getByRole("heading", { name: "Riley Chen", level: 1 }),
  ).toBeVisible();
  // The portrait hero shows the featured work, so the grid does not repeat it.
  await expect(work(page)).toHaveCount(3);
  const featured = page.getByRole("button", { name: "Read the work" });
  await featured.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "The train window holds the lake",
  );
  await page.keyboard.press("Escape");
  await expect(featured).toBeFocused();
  await page.getByRole("button", { name: "Writing", exact: true }).click();
  await expect(work(page)).toHaveCount(2);
  await expect(page.getByText("Showing 2 writing works.")).toBeAttached();
  await page.getByRole("button", { name: "All work", exact: true }).click();
  await expect(work(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Read Tidal glossary" }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Tidal glossary");
  await page.keyboard.press("Escape");
  const record = page.getByRole("region", { name: "Track record" });
  await record
    .getByRole("button", { name: /^Confirmed\./ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "recorded this outcome on Missa",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Profile sections" }),
  ).toBeVisible();
  for (const width of [1280, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectAccessible(page);
});

test("each lens, theme and hero stays readable and accessible", async ({
  page,
}) => {
  for (const query of [
    "lens=visual&theme=night&hero=plate",
    "lens=sound&theme=mineral&hero=type",
    "lens=stage&theme=mineral&hero=portrait",
    "sparse=1",
  ]) {
    await page.goto(`/design-system/creator-profile-v2?${query}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoOverflow(page);
    await expectAccessible(page);
    await page.setViewportSize({ width: 1280, height: 844 });
  }
});

test("a broken image never blocks the work it belongs to", async ({ page }) => {
  await page.route("**/media/creator-preview-landscape.webp", (route) =>
    route.abort(),
  );
  await page.goto("/design-system/creator-profile-v2");
  await page.getByRole("button", { name: "Read the work" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "The train window holds the lake",
  );
});

test("the studio builds a profile section by section and previews it as visitors see it", async ({
  page,
}) => {
  await page.goto("/profile/portfolio");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/portfolio-link-preview?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      json: {
        title: "A linked project",
        description: "A real preview-shaped response for the editor test.",
        hostname: "example.com",
      },
    });
  });
  await page.goto("/design-system/creator-profile-settings");
  const rail = page.getByRole("navigation", { name: "Profile editor" });
  const editor = page.getByRole("region", { name: "Edit section" });
  const status = page.getByRole("status").first();
  await expect(status).toContainText("Saved on this device");

  await rail.getByRole("button", { name: "Basics" }).click();
  await editor
    .getByLabel("Name", { exact: true })
    .fill("Test Creator with a long interdisciplinary name");
  await editor
    .getByLabel(/^One-line statement/)
    .fill("Poems and photographs about leaving.");
  await editor.getByRole("button", { name: "All sections" }).click();

  await rail.getByRole("button", { name: /^Selected work/ }).click();
  await editor.getByRole("button", { name: "Add work" }).click();
  await editor.getByLabel("Title", { exact: true }).fill("A private work");
  await editor.getByLabel(/^Link/).fill("javascript:alert(1)");
  await expect(editor.getByText("Use a full link")).toBeVisible();
  await editor.getByLabel(/^Link/).fill("https://example.com/work");
  await expect(editor.getByText("Loading link preview…")).toBeVisible();
  await expect(
    editor.getByRole("heading", { name: "A linked project" }),
  ).toBeVisible();
  await editor.getByLabel(/^Text/).fill("First piece. ".repeat(30));
  await editor
    .getByLabel("Image", { exact: true })
    .setInputFiles("public/media/creator-preview-landscape.png");
  await expect(
    editor.getByRole("button", { name: "Replace image" }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Done" }).click();
  await editor.getByRole("button", { name: "Add work" }).click();
  await editor
    .getByLabel("Title", { exact: true })
    .fill("Second selected work");
  await editor
    .getByLabel(/^Text/)
    .fill("Second piece, distinct reading content.");
  await editor.getByRole("button", { name: "Move work 2 up" }).click();
  await expect(status).toContainText("Changes will save shortly");
  await expect(status).toContainText("Saved on this device");

  await page.reload();
  await expect(status).toContainText("Saved on this device");
  await page.getByRole("button", { name: "Preview profile" }).click();
  const preview = page.getByRole("dialog", { name: "Profile preview" });
  await expect(
    preview.getByRole("heading", {
      name: "Test Creator with a long interdisciplinary name",
    }),
  ).toBeVisible();
  // The first work is featured in the hero, so the grid holds the other one.
  await expect(preview.locator("article")).toHaveCount(1);
  await expect(preview.locator("article h4")).toHaveText([
    "Second selected work",
  ]);
  await preview
    .getByRole("figure")
    .getByRole("button", { name: "A private work" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "A private work" }),
  ).toContainText("First piece.");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await rail.getByRole("button", { name: /^Selected work/ }).click();
  await editor
    .getByRole("button", { name: "Remove Second selected work" })
    .click();
  await expect(
    editor.getByText("Removed “Second selected work”."),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Undo" }).click();
  await expect(
    editor.getByRole("button", { name: "Remove Second selected work" }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "All sections" }).click();

  await rail.getByRole("button", { name: /^Track record/ }).click();
  await editor.getByRole("button", { name: "Add entry" }).click();
  await editor.getByLabel(/^What it was/).fill("Published work");
  await page.route("**/api/publications/search?**", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "journal-fixture",
            name: "A journal",
            kind: "literary_magazine",
            href: "/journal/a-journal",
          },
        ],
      },
    }),
  );
  await editor
    .getByRole("combobox", { name: "Publication or organization" })
    .fill("A journal");
  await page.getByRole("option", { name: /A journal/ }).click();
  await expect(
    editor.getByText("Linked to A journal in the directory."),
  ).toBeVisible();
  await editor.getByRole("button", { name: "All sections" }).click();
  await rail.getByRole("switch", { name: "Show Press" }).click();
  await expect(status).toContainText("Changes will save shortly");
  await expect(status).toContainText("Saved on this device");
  await expectNoOverflow(page);
  await expectAccessible(page, "body");

  await rail.getByRole("button", { name: /^Appearance/ }).click();
  await editor.getByRole("radio", { name: /After hours/ }).click();
  await expect(status).toContainText("Changes will save shortly");
  await expect(status).toContainText("Saved on this device");
  await page.reload();
  await page.getByRole("button", { name: "Preview profile" }).click();
  await expect(
    preview.locator('[data-creator-theme="night"]').first(),
  ).toHaveCSS("background-color", "rgb(23, 20, 24)");
  await expect(
    preview.getByRole("link", { name: /A journal/ }),
  ).toHaveAttribute("href", "/journal/a-journal");
  await expectAccessible(page, '[role="dialog"]');
});

test("the desktop studio keeps a live preview beside the editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-system/creator-profile-settings?sample=1");
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(
    preview.getByRole("heading", { name: "Riley Chen", level: 2 }),
  ).toBeVisible();
  const editor = page.getByRole("region", { name: "Edit section" });
  await editor.getByLabel("Name", { exact: true }).fill("Riley Chen-Okafor");
  await expect(
    preview.getByRole("heading", { name: "Riley Chen-Okafor", level: 2 }),
  ).toBeVisible();
  const rail = page.getByRole("navigation", { name: "Profile editor" });
  await rail.getByRole("switch", { name: "Show Track record" }).click();
  await expect(
    preview.getByRole("region", { name: "Track record" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Phone preview" }).click();
  await expect(
    preview.getByRole("heading", { name: "Riley Chen-Okafor", level: 2 }),
  ).toBeVisible();
  await expectNoOverflow(page);
  await expectAccessible(page, "body");
});

test("link preview failure is recoverable and private addresses are blocked", async ({
  page,
}) => {
  for (const url of [
    "http://127.0.0.1:3000",
    "http://169.254.169.254/",
    "http://10.0.0.1",
    "file:///etc/passwd",
    "http://[::1]",
  ]) {
    const response = await page.request.get("/api/portfolio-link-preview", {
      params: { url },
    });
    expect(response.status()).toBe(422);
  }
  let failed = true;
  await page.route("**/api/portfolio-link-preview?**", (route) =>
    route.fulfill({
      status: failed ? 422 : 200,
      json: failed
        ? {
            error:
              "This site does not provide a preview. Your link still works.",
          }
        : { title: "Recovered preview", hostname: "example.com" },
    }),
  );
  await page.goto("/design-system/creator-profile-settings");
  const editor = page.getByRole("region", { name: "Edit section" });
  await page
    .getByRole("navigation", { name: "Profile editor" })
    .getByRole("button", { name: /^Selected work/ })
    .click();
  await editor.getByRole("button", { name: "Add work" }).click();
  await editor.getByLabel(/^Link/).fill("https://example.com");
  await expect(
    editor.getByText(
      "This site does not provide a preview. Your link still works.",
    ),
  ).toBeVisible();
  failed = false;
  await editor.getByRole("button", { name: "Try preview again" }).click();
  await expect(
    editor.getByRole("heading", { name: "Recovered preview" }),
  ).toBeVisible();
});

test("media removal persists in a private draft and creator APIs need a session", async ({
  page,
  request,
}) => {
  await page.goto("/design-system/creator-profile-settings");
  const editor = page.getByRole("region", { name: "Edit section" });
  const status = page.getByRole("status").first();
  await expect(status).toContainText("Saved on this device");
  await editor.getByLabel("Name", { exact: true }).fill("Maya Bennett");
  await editor.getByLabel("Portrait", { exact: true }).setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6vQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(
    editor.getByRole("button", { name: "Replace portrait" }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "Add portrait" }),
  ).toBeVisible();
  await expect(status).toContainText("Changes will save shortly");
  await expect(status).toContainText("Saved on this device");
  await page.reload();
  await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
    "Maya Bennett",
  );
  await expect(
    editor.getByRole("button", { name: "Add portrait" }),
  ).toBeVisible();
  for (const [path, method] of [
    ["portfolio-draft", "GET"],
    ["portfolio-draft", "PUT"],
    ["portfolio-publish", "POST"],
    ["portfolio-publish", "DELETE"],
    ["portfolio-media", "POST"],
    ["portfolio-outcomes", "GET"],
  ] as const) {
    const res = await request.fetch(`/api/creator/${path}`, {
      method,
      data: method === "GET" ? undefined : {},
    });
    expect(res.status()).toBe(401);
  }
});

test("sample profile opens the message form but never sends, and Follow explains itself", async ({
  page,
}) => {
  let sent = false;
  await page.route("**/api/profiles/**", (route) => {
    sent = true;
    return route.abort();
  });
  await page.goto("/design-system/creator-profile-v2");
  await page.getByRole("button", { name: "Get in touch" }).click();
  const dialog = page.getByRole("dialog", { name: "Write to Riley" });
  await expect(dialog).toContainText("email address stays private");
  await dialog.getByLabel("Your name").fill("Ada Mensah");
  await dialog.getByLabel("Your email").fill("ada@example.com");
  await dialog.getByLabel("Message").fill("Could we talk about a commission?");
  await expectAccessible(page, '[role="dialog"]');
  await dialog.getByRole("button", { name: "Send message" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "This is a sample profile, so nothing was sent.",
  );
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Follow" }).click();
  await expect(
    page.getByText("This is a sample profile, so following is off."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Invite to apply" }),
  ).toHaveCount(0);
  expect(sent).toBe(false);
});

test("the profile inbox triages messages and invitations at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/creator-profile-inbox");
  await expect(
    page.getByRole("heading", { name: "Profile inbox", level: 1 }),
  ).toBeVisible();
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText([
    "Ada Mensah",
    "Theo Park",
  ]);
  await expect(
    panel.getByRole("link", { name: "Reply by email" }).first(),
  ).toHaveAttribute("href", /^mailto:ada@example\.com/);
  await panel
    .getByRole("button", { name: "Archive", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status").first()).toHaveText(
    "Archived Ada Mensah's message.",
  );
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText([
    "Theo Park",
  ]);
  await page.getByRole("button", { name: "Show archived" }).click();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText([
    "Ada Mensah",
  ]);
  await page.getByRole("button", { name: "Show current" }).click();
  await page.getByRole("tab", { name: /Invitations/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Spring reading period",
  );
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "Not for me" })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText("No invitations yet");
  await page.getByRole("tab", { name: /Following/ }).click();
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: "Unfollow" })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "You're not following anyone",
  );
  await expectNoOverflow(page);
  await expectAccessible(page);
  await page.goto("/design-system/creator-profile-inbox?empty=1");
  await expect(page.getByRole("tabpanel")).toContainText("No messages yet");
});

test("creators can turn messages and invitations off in the studio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-system/creator-profile-settings?sample=1");
  const rail = page.getByRole("navigation", { name: "Profile editor" });
  const editor = page.getByRole("region", { name: "Edit section" });
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(
    preview.getByRole("button", { name: "Get in touch" }),
  ).toBeVisible();
  await rail.getByRole("button", { name: /^About and contact/ }).click();
  await editor
    .getByRole("switch", { name: "Let visitors message you through Missa" })
    .click();
  await expect(
    preview.getByRole("button", { name: "Get in touch" }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("switch", {
      name: "Let organizations invite you to apply",
    }),
  ).toBeChecked();
});
