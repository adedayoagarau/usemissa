import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public portfolio has distinct formats, full reading and accessible mobile media", async ({
  page,
}) => {
  await page.goto("/design-system/creator-profile-v2");
  await expect(
    page.getByRole("button", { name: "Create your profile" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sound", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Writing", exact: true }).click();
  await expect(page.getByRole("button", { name: /Enlarge image/ })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Read poem" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "Each valley holds its breath",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Read poem" })).toBeFocused();
  await page.getByRole("button", { name: "Images", exact: true }).click();
  await expect(page.getByRole("button", { name: "Read poem" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Books", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Selected publications", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Writing, field recordings & photography", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/A study of places in transition/)).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: /Enlarge image/ }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "All work", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Field notes from the in-between",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("fictional sample book");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "The Quiet Review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "fictional sample publication",
  );
  await page.keyboard.press("Escape");
  for (const width of [1280, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("heading", { name: "Riley Chen" }).click();
  await page.screenshot({
    path: "/tmp/missa-portfolio-mobile.png",
    fullPage: true,
  });
});

test("full-page editor saves at the creator’s pace and previews each kind of work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile/portfolio");
  await expect(page).toHaveURL(/\/login\?next=/);
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
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Name", { exact: true })
    .fill("Test Creator with a long interdisciplinary name");
  await page
    .getByLabel("Introduction", { exact: true })
    .fill("A calm introduction. ".repeat(10));
  await page
    .getByRole("button", { name: "Your practices", exact: true })
    .click();
  await page.getByRole("button", { name: "Writing", exact: true }).click();
  await page.getByRole("button", { name: "Photography", exact: true }).click();
  await page
    .getByRole("button", { name: "Selected works", exact: true })
    .click();
  await page.getByRole("button", { name: "Add your first work" }).click();
  await page.getByLabel("Work title", { exact: true }).fill("A private work");
  await page.getByLabel("Work link · optional").fill("javascript:alert(1)");
  await expect(
    page.getByRole("status").filter({ hasText: "Use a full link" }),
  ).toBeVisible();
  await page
    .getByLabel("Work link · optional")
    .fill("https://example.com/work");
  await expect(page.getByText("Loading link preview…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A linked project" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Write text", exact: true }).click();
  await page.getByLabel("Text or description").fill("First piece. ".repeat(30));
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles("public/media/creator-preview-landscape.png");
  await expect(
    page.getByRole("img", { name: "A private work", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add another work" }).click();
  await page
    .getByLabel("Work title", { exact: true })
    .fill("Second selected work");
  await page.getByRole("button", { name: "Write text", exact: true }).click();
  await page
    .getByLabel("Text or description")
    .fill("Second piece, distinct reading content.");
  await page.getByRole("button", { name: "Move work 2 up" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.getByRole("status").first()).toContainText("restored");
  await page
    .getByRole("button", { name: "Preview profile", exact: true })
    .click();
  await expect(page.locator("article h2")).toHaveText([
    "Second selected work",
    "A private work",
  ]);
  await page.getByRole("button", { name: "Images", exact: true }).click();
  await expect(page.locator("article h2")).toHaveText(["A private work"]);
  await expect(
    page.getByRole("link", { name: "Open A private work (opens in new tab)" }),
  ).toHaveAttribute("href", "https://example.com/work");
  await page.getByRole("button", { name: "Writing", exact: true }).click();
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Read full text" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Second piece, distinct reading content.",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to editing" }).click();
  await page
    .getByRole("button", { name: "Selected works", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove work 1" }).click();
  await page.getByRole("button", { name: "Books", exact: true }).click();
  await page.getByLabel("Book title · optional").fill("My book");
  await page
    .getByLabel("Book link", { exact: true })
    .fill("https://example.com/book");
  await page.getByRole("button", { name: "Publications", exact: true }).click();
  await page.getByLabel("Published piece · optional").fill("Published work");
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
  await page
    .getByRole("combobox", { name: "Publication or organization" })
    .fill("A journal");
  await page.getByRole("option", { name: /A journal/ }).click();
  await expect(
    page.getByText("Linked to A journal in the directory."),
  ).toBeVisible();
  await page
    .getByLabel("Publication link", { exact: true })
    .fill("https://example.com/piece");
  await page
    .getByRole("button", { name: "Contact & links", exact: true })
    .click();
  await page.getByLabel("Website · optional").fill("https://example.com");
  await expect(page.getByRole("status").first()).toContainText(
    "Saved on this device",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/missa-editor-phone.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: /After hours/ }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(page.getByRole("status").first()).toContainText("restored");
  await page
    .getByRole("button", { name: "Preview profile", exact: true })
    .click();
  await expect(page.locator('[data-creator-theme="night"]').last()).toHaveCSS('background-color','rgb(23, 20, 24)');
  await expect(page.getByRole("link", { name: /A journal/ })).toHaveAttribute(
    "href",
    "/journal/a-journal",
  );
  const nightAudit = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(nightAudit.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({
    path: "/tmp/missa-editor-night.png",
    fullPage: true,
  });
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
  await page
    .getByRole("button", { name: "Selected works", exact: true })
    .click();
  await page.getByRole("button", { name: "Add your first work" }).click();
  await page.getByLabel("Work link · optional").fill("https://example.com");
  await expect(
    page.getByText(
      "This site does not provide a preview. Your link still works.",
    ),
  ).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Try preview again" }).click();
  await expect(
    page.getByRole("heading", { name: "Recovered preview" }),
  ).toBeVisible();
});

test('handle choice is optional in a private draft and media removal persists', async ({page,request})=>{
 await page.goto('/design-system/creator-profile-settings');
 await page.getByLabel('Name',{exact:true}).fill('Maya Bennett');
 await page.getByRole('button',{name:'Use @mayabennett',exact:true}).click();
 await expect(page.getByLabel('Handle',{exact:true})).toHaveValue('mayabennett');
 await expect(page.getByText('Availability is checked when you sign in.',{exact:false})).toBeVisible();
 await page.getByLabel('Profile photo',{exact:true}).setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6vQAAAABJRU5ErkJggg==','base64')});
 await expect(page.getByRole('button',{name:'Replace profile photo'})).toBeVisible();
 await page.getByRole('button',{name:'Remove profile photo'}).click();
 await expect(page.getByRole('img',{name:'Your profile photo preview'})).toHaveCount(0);
 await page.getByRole('button',{name:'Save now',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'on this device'})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Handle',{exact:true})).toHaveValue('mayabennett');
 await expect(page.getByRole('img',{name:'Your profile photo preview'})).toHaveCount(0);
 for(const [path,method] of [['portfolio-draft','GET'],['portfolio-draft','PUT'],['portfolio-publish','POST'],['portfolio-publish','DELETE'],['portfolio-media','POST']] as const){
  const res=await request.fetch(`/api/creator/${path}`,{method,data:method==='GET'?undefined:{}});expect(res.status()).toBe(401);
 }
});
