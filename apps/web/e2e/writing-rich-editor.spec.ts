import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { newWritingEntryId } from "../lib/writing";
import { newWritingProjectId } from "../lib/writing-projects";
import {
  plainTextToDocument,
  serializeDocument,
  toCanvasPage,
} from "../lib/writing-document";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WZkAAAAASUVORK5CYII=",
  "base64",
);
const modifier = process.platform === "darwin" ? "Meta" : "Control";

async function signIn(page: Page) {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `rich-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "correct-horse-battery",
      givenName: "Adaeze",
      familyName: "Writer",
    },
  });
  expect(signup.status()).toBe(201);
  const cookie = signup
    .headers()
    ["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  await page.context().addCookies([
    {
      name: "missa_session",
      value: cookie!,
      url: new URL(signup.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("links, tables and local images save and reopen as rich content", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/doc");
  const text = page.locator('[data-slot="writing-page-text"]').first();
  await expect(text).toBeVisible();
  await page.getByRole("button", { name: "Formatting", exact: true }).click();
  await text.fill("A reference and notes.");
  await text.press(`${modifier}+a`);
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  let sheet = page.getByRole("dialog", { name: "Insert", exact: true });
  await sheet
    .getByLabel("Web address or email link", { exact: true })
    .fill("https://example.com/source");
  await sheet.getByRole("button", { name: "Add link", exact: true }).click();
  await expect(text.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  const url = page.url();
  await text.locator("a").click();
  expect(page.url()).toBe(url);
  await text.press(`${modifier}+End`);
  await text.press("Enter");
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  sheet = page.getByRole("dialog", { name: "Insert", exact: true });
  await sheet
    .getByRole("button", { name: "Insert table", exact: true })
    .click();
  await expect(text.locator("table tr")).toHaveCount(3);
  await text.locator("th").first().click();
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Insert", exact: true })
    .getByRole("button", { name: "Add row below", exact: true })
    .click();
  await expect(text.locator("table tr")).toHaveCount(4);
  await text.press(`${modifier}+End`);
  await text.press("ArrowDown");
  await page.getByRole("button", { name: "Insert", exact: true }).click();
  sheet = page.getByRole("dialog", { name: "Insert", exact: true });
  await sheet.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "one-pixel.png",
    mimeType: "image/png",
    buffer: png,
  });
  await sheet
    .getByLabel("Image description", { exact: true })
    .fill("A single pixel");
  await sheet
    .getByRole("button", { name: "Insert image", exact: true })
    .click();
  await expect(text.locator('img[alt="A single pixel"]')).toBeVisible();
  await expect
    .poll(async () => {
      const id = new URL(page.url()).searchParams.get("entry");
      if (!id) return false;
      const response = await page.request.get(`/api/me/writing/${id}`);
      if (!response.ok()) return false;
      const value = await response.json();
      return (
        typeof value.entry?.document === "string" &&
        value.entry.document.includes("A single pixel")
      );
    })
    .toBe(true);
  await page.reload();
  await expect(
    page.locator('[data-slot="writing-page-text"] table tr'),
  ).toHaveCount(4);
  await expect(
    page.locator('[data-slot="writing-page-text"] img[alt="A single pixel"]'),
  ).toHaveAttribute("src", `data:image/png;base64,${png.toString("base64")}`);
});

test("combined canvas and flow pieces use unique instructions and never fetch remote images", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const projectId = newWritingProjectId();
  expect(
    (
      await page.request.post("/api/me/writing/projects", {
        data: { id: projectId, title: "Rich project", template: "blank" },
      })
    ).status(),
  ).toBe(201);
  const firstId = newWritingEntryId();
  const canvasId = newWritingEntryId();
  const canvas = plainTextToDocument("Canvas text", "newsreader");
  canvas.pages = [toCanvasPage(canvas.pages[0]!, canvas.pageSize)];
  canvas.pages[0]!.blocks![0]!.content.content!.push(
    {
      type: "image",
      attrs: {
        src: "https://missa-unrequested.invalid/private.png",
        alt: "Remote image",
      },
    },
    {
      type: "image",
      attrs: {
        src: `data:image/png;base64,${png.toString("base64")}`,
        alt: "Local image",
      },
    },
  );
  for (const [id, title, doc] of [
    [firstId, "Flow", plainTextToDocument("First piece", "newsreader")],
    [canvasId, "Canvas", canvas],
  ] as const) {
    expect(
      (
        await page.request.put(`/api/me/writing/${id}`, {
          data: {
            title,
            body: title,
            document: serializeDocument(doc),
            baseRevision: 0,
            projectId,
          },
        })
      ).status(),
    ).toBe(200);
  }
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("missa-unrequested.invalid"))
      remoteRequests.push(request.url());
  });
  await page.goto(`/doc?entry=${firstId}`);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page
    .getByRole("button", { name: "Project workspace", exact: true })
    .click();
  const tools = page.getByRole("complementary", {
    name: "Rich project · project tools",
    exact: true,
  });
  await tools
    .getByRole("button", { name: "Edit manuscript together", exact: true })
    .click();
  const studio = page.getByRole("main");
  await expect(studio.locator("[data-manuscript-piece]")).toHaveCount(2);
  await expect(studio.locator('img[alt="Remote image"]')).not.toHaveAttribute(
    "src",
    /.+/,
  );
  await expect(studio.locator('img[alt="Local image"]')).toHaveAttribute(
    "src",
    /data:image\/png;base64,/,
  );
  const described = await studio
    .locator('[data-slot="writing-page-text"], [data-slot="writing-box-text"]')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const id = element.getAttribute("aria-describedby");
        return {
          id,
          matches: id
            ? document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length
            : 0,
          spellcheck: element.getAttribute("spellcheck"),
        };
      }),
    );
  expect(
    described.every(
      (item) => item.id && item.matches === 1 && item.spellcheck === "false",
    ),
  ).toBe(true);
  expect(new Set(described.map((item) => item.id)).size).toBe(2);
  expect(remoteRequests).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      studio.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    )
    .toBe(true);
});

test("selection tools preserve text, links, checklist and numbered footnotes after reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const id = newWritingEntryId();
  const document = plainTextToDocument("A source to check.", "newsreader");
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Selection tools",
          body: "A source to check.",
          document: serializeDocument(document),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  const text = page.locator('[data-slot="writing-page-text"]').first();
  await text.click();
  await text.press(`${modifier}+a`);
  const toolbar = page.getByRole("toolbar", {
    name: "Selection formatting",
    exact: true,
  });
  await expect(toolbar).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Selection formatting"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/missa-selection-tools-desktop.png" });
  await toolbar
    .getByRole("button", { name: "Selection actions", exact: true })
    .click();
  await expect(
    page.getByText("4 selected words", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy plain text", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comment", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("4 selected words", { exact: true })).toHaveCount(
    0,
  );

  await toolbar
    .getByRole("button", { name: "Bold selection", exact: true })
    .click();
  await expect(text.locator("strong")).toHaveText("A source to check.");
  await toolbar
    .getByRole("button", { name: "Highlight selection", exact: true })
    .click();
  await expect(text.locator("mark")).toHaveText("A source to check.");
  await toolbar.getByRole("button", { name: "Add link", exact: true }).click();
  await page
    .getByLabel("Web address or email link", { exact: true })
    .fill("https://example.com/source");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(text.locator("a")).toHaveText("A source to check.");
  await expect(text.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  await expect(
    page.getByLabel("Web address or email link", { exact: true }),
  ).toHaveCount(0);
  await toolbar
    .getByRole("button", { name: "Checklist", exact: true })
    .click({ timeout: 10_000 });
  await expect(text.locator('li[data-type="taskItem"]')).toHaveCount(1);
  await text.locator('input[type="checkbox"]').check();
  await toolbar
    .getByRole("button", { name: "Add footnote", exact: true })
    .click();
  await page
    .getByLabel("Footnote", { exact: true })
    .fill("A source description.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(text).toContainText("A source to check.");
  await expect(text.locator("sup[data-note-id]")).toHaveText("1");
  await expect(
    page.getByRole("region", { name: "Footnotes", exact: true }),
  ).toContainText("A source description.");
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/me/writing/${id}`);
      return (await response.json()).entry?.document;
    })
    .toContain("A source description.");
  await page.reload();
  await expect(text.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  await expect(text.locator("mark")).toHaveText("A source to check.");
  await expect(text.locator('input[type="checkbox"]')).toBeChecked();
  await expect(text.locator("sup[data-note-id]")).toHaveText("1");
});

test("image description and caption edit contextually, with mobile and keyboard selection controls", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  const id = newWritingEntryId();
  const document = plainTextToDocument("A picture and a line.", "newsreader");
  document.pages[0]!.content.content!.push({
    type: "image",
    attrs: {
      src: `data:image/png;base64,${png.toString("base64")}`,
      alt: "Original description",
    },
  });
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Image and selection",
          body: "A picture and a line.",
          document: serializeDocument(document),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  const text = page.locator('[data-slot="writing-page-text"]').first();
  await text.locator("img").click();
  const toolbar = page.getByRole("toolbar", {
    name: "Selection formatting",
    exact: true,
  });
  await toolbar
    .getByRole("button", { name: "Edit image", exact: true })
    .click();
  await page
    .getByLabel("Image description", { exact: true })
    .fill("A small pixel image");
  await page
    .getByLabel("Caption", { exact: true })
    .fill("Figure one: a pixel.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(text.locator("figcaption")).toHaveText("Figure one: a pixel.");
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/me/writing/${id}`);
      return (await response.json()).entry?.document;
    })
    .toContain("Figure one: a pixel.");
  await page.reload();
  await expect(text.locator("img")).toHaveAttribute(
    "alt",
    "A small pixel image",
  );
  await expect(text.locator("figcaption")).toHaveText("Figure one: a pixel.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await text.locator("p").first().click();
  await text.press(`${modifier}+a`);
  await expect(toolbar).toBeVisible();
  const bounds = await toolbar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Selection formatting"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/missa-selection-tools-mobile.png" });
  await toolbar
    .getByRole("button", { name: "Bold selection", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(text.locator("strong")).toContainText("A picture and a line.");
  await expect(text).toBeFocused();
  await toolbar
    .getByRole("button", { name: "Italic selection", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(text).toBeFocused();
  await expect(toolbar).not.toBeVisible();
  await page.evaluate(() => {
    window.document.documentElement.style.zoom = "2";
  });
  await text.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);
  await expect(page.getByRole("button", { name: /words selected.*Word count/u, includeHidden: true })).toHaveCount(0);
  await text.press(`${modifier}+a`);
  await expect(toolbar).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("main")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    )
    .toBe(true);
});

test("context section moves undo and native menu remains available", async ({
  page,
}) => {
  await signIn(page);
  const id = newWritingEntryId();
  const document = plainTextToDocument("", "newsreader");
  document.pages[0]!.content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "First section" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "First body" }] },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Second section" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Second body" }] },
    ],
  };
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Sections",
          body: "First body Second body",
          document: serializeDocument(document),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  const text = page.locator('[data-slot="writing-page-text"]').first();
  await text.locator("h1").first().click({ button: "right" });
  await expect(
    page.getByRole("menuitem", {
      name: "Move section up on this page",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("menuitem", {
      name: "Move section down on this page",
      exact: true,
    })
    .click();
  await expect(text.locator("h1").first()).toHaveText("Second section");
  await expect(text.locator("p").first()).toHaveText("Second body");
  await text.click();
  await text.press(`${modifier}+z`);
  await expect(text.locator("h1").first()).toHaveText("First section");
  await text.locator("h1").first().click({ button: "right" });
  await expect(
    page.getByText("Shift-right-click opens the browser menu."),
  ).toBeVisible();
  await expect(page.getByRole("menu", { name: "Writing actions" })).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="context-menu-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await text
    .locator("h1")
    .first()
    .click({ button: "right", modifiers: ["Shift"] });
  await expect(
    page.getByRole("menuitem", {
      name: "Move section down on this page",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("menuitemradio", { name: "Draft, no paper", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("menuitemradio", { name: "Draft, no paper", exact: true }),
  ).toHaveCount(0);
  await text.locator("h1").first().click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Copy section link", exact: true })
    .click();
  await expect(text.locator("h1").first()).toHaveAttribute(
    "data-section-id",
    /^section_/,
  );
  const sectionId = await text
    .locator("h1")
    .first()
    .getAttribute("data-section-id");
  await text.locator("h1").first().click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Fold section", exact: true })
    .click();
  await expect(text.locator("p").first()).not.toBeVisible();
  await expect(text.locator("p").nth(1)).toBeVisible();
  await text.locator("h1").first().click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Unfold section", exact: true })
    .click();
  await expect(text.locator("p").first()).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/me/writing/${id}`)).json()).entry
          ?.document,
    )
    .toContain(sectionId!);
  await page.goto(`/doc?entry=${id}#${sectionId}`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.getSelection()?.anchorNode?.parentElement?.closest("h1,h2")
            ?.id,
      ),
    )
    .toBe(sectionId);
  await expect(text.locator("h1").first()).toHaveAttribute(
    "data-section-id",
    sectionId!,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await text.locator("h1").first().click();
  const toolbar = page.getByRole("toolbar", { name: "Selection formatting" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "Selection actions" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Move section down on this page",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(text).toBeFocused();
  await page.evaluate(() => {
    window.document.documentElement.style.zoom = "2";
  });
  await text.locator("h1").first().click({ button: "right" });
  const context = page.getByRole("menu", { name: "Writing actions" });
  await expect(context).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await context.boundingBox();
      return bounds
        ? bounds.x >= 0 &&
            bounds.x + bounds.width <= 391 &&
            bounds.y >= 0 &&
            bounds.y + bounds.height <= 845
        : false;
    })
    .toBe(true);
  await page.screenshot({ path: "/tmp/missa-section-context-mobile-zoom.png" });
});

test("local image replacement and width preserve metadata across reload", async ({
  page,
}) => {
  await signIn(page);
  const id = newWritingEntryId();
  const document = plainTextToDocument("Image context", "newsreader");
  document.pages[0]!.content.content!.push({
    type: "image",
    attrs: {
      src: `data:image/png;base64,${png.toString("base64")}`,
      alt: "A pixel",
      caption: "Figure one",
      widthPercent: 100,
    },
  });
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Image replacement",
          body: "Image context",
          document: serializeDocument(document),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  const text = page.locator('[data-slot="writing-page-text"]').first();
  await text.locator("img").click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Edit or replace image", exact: true })
    .click();
  await page.getByLabel("Replace image file", { exact: true }).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "PNG or JPEG" }),
  ).toContainText("PNG or JPEG");
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  const replacement = await page.screenshot({
    clip: { x: 0, y: 0, width: 2, height: 2 },
  });
  await page.getByLabel("Replace image file", { exact: true }).setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: replacement,
  });
  await expect(
    page.getByText("Replacement ready. Save to apply.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Image width", { exact: true }).selectOption("50");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(text.locator("img")).toHaveAttribute("data-width-percent", "50");
  await expect(text.locator("img")).toHaveAttribute(
    "src",
    `data:image/png;base64,${replacement.toString("base64")}`,
  );
  await expect(text.locator("img")).toHaveAttribute("alt", "A pixel");
  await expect(text.locator("figcaption")).toHaveText("Figure one");
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/me/writing/${id}`)).json()).entry
          ?.document,
    )
    .toContain('"widthPercent":50');
  await page.reload();
  await expect(text.locator("img")).toHaveAttribute("data-width-percent", "50");
  await expect(text.locator("figcaption")).toHaveText("Figure one");
});
