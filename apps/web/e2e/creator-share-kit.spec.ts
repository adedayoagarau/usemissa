import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import { resolve } from "node:path";

/*
 * The share kit: the generated images, the A6 event card and the studio panel.
 * Everything runs against the design-system twins, which draw the same
 * components and selection as the live routes from the fictional sample creator,
 * so no database is needed.
 */

const PANEL = "/design-system/creator-share-kit";
const CARD = "/design-system/creator-event-card";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function axe(page: Page, selector = "main") {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(WCAG)
    .analyze();
  expect(results.violations).toEqual([]);
}

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

/** Width and height from a PNG's header. */
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe("generated images", () => {
  test("the link card is 1200 × 630 and the story is 1080 × 1920", async ({
    request,
  }) => {
    const card = await request.get("/design-system/creator-share-image");
    expect(card.status()).toBe(200);
    expect(card.headers()["content-type"]).toContain("image/png");
    expect(pngSize(await card.body())).toEqual({ width: 1200, height: 630 });

    const story = await request.get("/design-system/creator-story-image");
    expect(story.status()).toBe(200);
    expect(story.headers()["content-type"]).toContain("image/png");
    expect(pngSize(await story.body())).toEqual({ width: 1080, height: 1920 });
  });

  test("the empty and long cases still draw", async ({ request }) => {
    for (const query of [
      "image=0",
      "photo=0&open=0",
      "bare=1",
      "long=1",
      "empty=1",
    ]) {
      for (const route of ["creator-share-image", "creator-story-image"]) {
        const response = await request.get(`/design-system/${route}?${query}`);
        expect(response.status(), `${route}?${query}`).toBe(200);
        const { width } = pngSize(await response.body());
        expect(width).toBeGreaterThan(1000);
      }
    }
  });
});

test.describe("event card", () => {
  test("shows when, what, who, where and a named QR code", async ({ page }) => {
    await page.goto(CARD);
    const card = page.getByRole("article", {
      name: "Event card: Reading from Field notes",
    });
    await expect(
      card.getByRole("heading", { level: 1, name: "Reading from Field notes" }),
    ).toBeVisible();
    await expect(card).toContainText(/Reading · Mon 18 Jan \d{4} · 19:00/);
    await expect(card).toContainText("Riley Chen");
    await expect(card).toContainText("Saltmarsh Writers’ House, Fife");
    await expect(card).toContainText("Scan for the writing and images.");
    await expect(
      card.getByRole("img", {
        name: "QR code linking to Riley Chen’s profile",
      }),
    ).toBeVisible();
    await expect(card).toContainText("usemissa.com/@rileychen");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await axe(page);
  });

  test("an unknown event is a 404", async ({ request }) => {
    const response = await request.get(`${CARD}?event=nope`);
    expect(response.status()).toBe(404);
  });

  test("a second event gets its own card", async ({ page }) => {
    await page.goto(`${CARD}?event=e_2`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "A frequency for the footpath",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Ferry Building Gallery, Vancouver"),
    ).toBeVisible();
  });

  test("prints as one A6 page with only the card on it", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "PDF export is Chromium only.");
    await page.goto(CARD);
    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("button", { name: "Print or save as PDF" }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Back to profile" }),
    ).toBeHidden();
    const box = await page.getByRole("article").boundingBox();
    expect(box!.width).toBeCloseTo((105 / 25.4) * 96, 0);
    expect(box!.height).toBeCloseTo((148 / 25.4) * 96, 0);

    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString(
      "latin1",
    );
    expect(pdf.match(/\/Type\s*\/Page\b(?!s)/g)).toHaveLength(1);
    const media = pdf.match(
      /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/,
    );
    expect(Number(media![1])).toBeCloseTo((105 / 25.4) * 72, 0);
    expect(Number(media![2])).toBeCloseTo((148 / 25.4) * 72, 0);
  });

  test("a long title, name and place stay inside the card at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${CARD}?long=1`);
    await noHorizontalScroll(page);
    const card = page.getByRole("article");
    const frame = (await card.boundingBox())!;
    for (const part of [
      card.getByRole("heading"),
      card.getByRole("img"),
      card.getByText("Scan for the"),
      card.getByText("Missa", { exact: true }),
    ]) {
      const box = (await part.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(frame.y);
      expect(box.y + box.height).toBeLessThanOrEqual(
        frame.y + frame.height + 1,
      );
      expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    }
    // The title never runs into the code.
    const title = (await card.getByRole("heading").boundingBox())!;
    const code = (await card.getByRole("img").boundingBox())!;
    expect(title.y + title.height).toBeLessThanOrEqual(code.y + 1);
    await axe(page);
  });

  test("reflows at 200% zoom and is operable from the keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto(CARD);
    await noHorizontalScroll(page);
    // The consent banner comes first in the tab order; start at the page.
    await page.getByRole("link", { name: "Back to profile" }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Print or save as PDF" }),
    ).toBeFocused();
    // Print opens the browser's own dialog; record the call instead.
    await page.evaluate(() => {
      (window as unknown as { printed: number }).printed = 0;
      window.print = () => {
        (window as unknown as { printed: number }).printed += 1;
      };
    });
    await page.keyboard.press("Enter");
    expect(
      await page.evaluate(
        () => (window as unknown as { printed: number }).printed,
      ),
    ).toBe(1);
  });
});

test.describe("share kit panel", () => {
  test("published: previews, downloads, event cards, signature and link", async ({
    page,
  }) => {
    await page.goto(PANEL);
    await expect(
      page.getByRole("heading", { level: 2, name: "Share kit" }),
    ).toBeVisible();
    for (const name of [
      "Link card",
      "Story image",
      "Event cards",
      "Email signature",
      "Profile link",
    ])
      await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();

    const linkCard = page.getByRole("img", {
      name: "Link card for Riley Chen",
    });
    const story = page.getByRole("img", { name: "Story image for Riley Chen" });
    await expect(linkCard).toBeVisible();
    await expect(story).toBeVisible();
    for (const [image, size] of [
      [linkCard, [1200, 630]],
      [story, [1080, 1920]],
    ] as const)
      await expect
        .poll(() =>
          image.evaluate((element: HTMLImageElement) => [
            element.naturalWidth,
            element.naturalHeight,
          ]),
        )
        .toEqual(size);
    await expect(page.getByTestId("preview-loading")).toHaveCount(0);

    await expect(
      page.getByRole("link", { name: "Download link card" }),
    ).toHaveAttribute("download", "rileychen-link-card.png");
    await expect(
      page.getByRole("link", { name: "Download story" }),
    ).toHaveAttribute("download", "rileychen-story.png");

    const cards = page.getByRole("list", { name: "Upcoming events" });
    await expect(cards.getByRole("listitem")).toHaveCount(2);
    const open = cards.getByRole("link", {
      name: "Open card for Reading from Field notes (opens in a new tab)",
    });
    await expect(open).toHaveAttribute("target", "_blank");
    await expect(open).toHaveAttribute("href", /event=e_1/);

    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await expect(
      page.getByText("Showing your last published version"),
    ).toHaveCount(0);
    await axe(page);
  });

  test("changes since publishing: says so and offers to publish", async ({
    page,
  }) => {
    await page.goto(`${PANEL}?state=changed`);
    const notice = page.getByRole("status").filter({
      hasText: "Showing your last published version",
    });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("still show what visitors see");
    await expect(
      page.getByText("An event you’ve added since publishing has no card"),
    ).toBeVisible();
    await axe(page);
    await notice.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByTestId("publish-requests")).toHaveText(
      "Publish requested 1 time.",
    );
    await expect(
      page.getByText("Showing your last published version"),
    ).toHaveCount(0);
  });

  test("before the first publish: says what is coming and offers Publish", async ({
    page,
  }) => {
    await page.goto(`${PANEL}?state=unpublished`);
    await expect(
      page.getByText("Your share kit appears when you publish"),
    ).toBeVisible();
    for (const name of [
      "Link card",
      "Story image",
      "Event cards",
      "Email signature",
    ])
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);
    await axe(page);
    await page.getByRole("button", { name: "Publish profile" }).click();
    await expect(page.getByTestId("publish-requests")).toHaveText(
      "Publish requested 1 time.",
    );
    await expect(
      page.getByRole("img", { name: "Link card for Riley Chen" }),
    ).toBeVisible();
  });

  test("without an account there is no Publish, and it says why", async ({
    page,
  }) => {
    await page.goto(`${PANEL}?state=signed-out`);
    await expect(
      page.getByRole("button", { name: "Publishing needs an account" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Publish profile" }),
    ).toHaveCount(0);
    await expect(page.getByText("Sign in to claim your address")).toBeVisible();
    await axe(page);
  });

  test("no upcoming events says what to do", async ({ page }) => {
    await page.goto(`${PANEL}?events=none`);
    await expect(page.getByText("No upcoming events")).toBeVisible();
    await expect(page.getByText(/Add an event with a title/)).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Upcoming events" }),
    ).toHaveCount(0);
    await axe(page);

    await page.goto(`${PANEL}?events=hidden`);
    await expect(
      page.getByText(/Upcoming section is switched off/),
    ).toBeVisible();
  });

  test("no featured image is set in type, and says so", async ({ page }) => {
    await page.goto(`${PANEL}?image=0`);
    await expect(
      page.getByText(
        "Your featured work has no image, so the card is set in type.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Your featured work has no image, so the story is set in type.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Story image for Riley Chen" }),
    ).toBeVisible();
  });

  test("a picture that doesn't load says so and can be retried", async ({
    page,
  }) => {
    await page.goto(`${PANEL}?broken=1`);
    const failed = page.getByRole("alert").filter({
      hasText: "This preview didn’t load. Your profile is fine.",
    });
    await expect(failed).toHaveCount(2);
    await axe(page);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("not-a-picture")) requests.push(request.url());
    });
    await failed.first().getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests[0]).toContain("r=1");
  });

  test("a slow picture shows a placeholder, then the picture", async ({
    page,
  }) => {
    await page.goto(`${PANEL}?delay=1500`, { waitUntil: "commit" });
    await expect(page.getByTestId("preview-loading").first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Link card for Riley Chen" }),
    ).toBeVisible();
    await expect(page.getByTestId("preview-loading")).toHaveCount(0, {
      timeout: 15000,
    });
  });

  test("copies the signature as HTML, as plain text and the profile link", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Clipboard permissions are Chromium only.",
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(PANEL);
    const read = () =>
      page.evaluate(async () => {
        const [item] = await navigator.clipboard.read();
        const result: Record<string, string> = {};
        for (const type of item.types)
          result[type] = await (await item.getType(type)).text();
        return result;
      });

    await page.getByRole("button", { name: "Copy as HTML" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Signature copied" }),
    ).toContainText("Paste it into your mail app’s signature box.");
    const rich = await read();
    expect(rich["text/html"]).toMatch(/^<table\b/);
    expect(rich["text/html"]).toContain("Riley Chen");
    expect(rich["text/html"]).toContain(
      'href="https://www.usemissa.com/@rileychen"',
    );
    expect(rich["text/html"]).not.toMatch(/<(script|img|link|style)\b/);
    expect(rich["text/plain"]).toBe(
      "Riley Chen\nPoet, sound artist and photographer\nhttps://www.usemissa.com/@rileychen",
    );

    await page.getByRole("button", { name: "Copy as plain text" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Plain text copied." }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Riley Chen\nPoet, sound artist and photographer\nhttps://www.usemissa.com/@rileychen",
    );

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Profile link copied." }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "https://www.usemissa.com/@rileychen",
    );
  });

  test("when the browser refuses to copy, the text is handed over to copy by hand", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: undefined });
      document.execCommand = () => false;
    });
    await page.goto(PANEL);
    await page.getByRole("button", { name: "Copy as HTML" }).click();
    const refused = page
      .getByRole("status")
      .filter({ hasText: "Couldn’t copy" });
    await expect(refused).toContainText(
      "Select the HTML below and copy it yourself.",
    );
    const manual = page.getByRole("textbox", {
      name: "Signature to copy by hand",
    });
    await expect(manual).toBeFocused();
    await expect(manual).toHaveValue(/^<table\b/);
    await axe(page);

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Select the link and copy it yourself." }),
    ).toBeVisible();
  });

  test("the signature preview matches what is copied and holds no link", async ({
    page,
  }) => {
    await page.goto(PANEL);
    const preview = page
      .getByText("Preview", { exact: true })
      .locator("xpath=..");
    await expect(preview).toContainText("Riley Chen");
    await expect(preview).toContainText("Poet, sound artist and photographer");
    await expect(preview).toContainText("usemissa.com/@rileychen");
    await expect(preview.getByRole("link")).toHaveCount(0);
  });

  test("works at 390px: no sideways scroll, touch-sized controls, long content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PANEL}?state=changed&events=many&long=1`);
    await expect(
      page.getByRole("img", { name: /Story image for/ }),
    ).toBeVisible();
    await noHorizontalScroll(page);
    for (const control of await page
      .locator("main a:visible, main button:visible, main input:visible")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    await axe(page);
  });

  test("reflows at 320px and 200% zoom", async ({ page }) => {
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${PANEL}?events=many&long=1`);
      await expect(
        page.getByRole("img", { name: /Link card for/ }),
      ).toBeVisible();
      await noHorizontalScroll(page);
    }
  });

  test("is operable from the keyboard with visible focus", async ({ page }) => {
    await page.goto(PANEL);
    await expect(
      page.getByRole("img", { name: /Link card for/ }),
    ).toBeVisible();
    const download = page.getByRole("link", { name: "Download link card" });
    await download.focus();
    await expect(download).toBeFocused();
    expect(
      await download.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.boxShadow !== "none" || style.outlineStyle !== "none";
      }),
    ).toBe(true);
    // Tab order: downloads and card links come before the signature buttons.
    const copy = page.getByRole("button", { name: "Copy as HTML" });
    await copy.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("status").filter({ hasText: /copied|Couldn’t copy/ }),
    ).toBeVisible();
  });

  test("reduced motion: nothing animates", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${PANEL}?delay=1500`, { waitUntil: "commit" });
    const placeholder = page.getByTestId("preview-loading").first();
    await expect(placeholder).toBeVisible();
    expect(
      await placeholder.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
  });
});

/*
 * The real studio, with the account API mocked as in the account studio spec.
 * It checks the wiring this stream owns: the Share kit rail item, the props the
 * studio passes the panel, and Publish from inside the panel.
 */
test.describe("in the studio", () => {
  test("the device preview explains what publishing unlocks, without an account", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/design-system/creator-profile-settings?sample=1");
    await page.getByRole("button", { name: "Share kit" }).click();
    const editor = page.getByRole("region", { name: "Edit section" });
    await expect(
      editor.getByRole("heading", { level: 2, name: "Share kit" }),
    ).toBeVisible();
    await expect(
      editor.getByText("Your share kit appears when you publish"),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", { name: "Publishing needs an account" }),
    ).toBeDisabled();
    await axe(page, '[aria-label="Edit section"]');
  });

  test("publishing from the panel turns the kit on; later edits say it shows the last published version", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    page.on("pageerror", (error) => {
      throw error;
    });
    const year = new Date().getUTCFullYear() + 1;
    let draft: unknown = {
      handle: "maya-b",
      name: "Maya Bennett",
      selected: ["Poet"],
      works: [
        {
          id: "w_1",
          title: "Tidal glossary",
          text: "Ebb: what the water owes the shore.",
          featured: true,
        },
      ],
      events: [
        {
          id: "e_1",
          kind: "Reading",
          title: "Reading from Tidal glossary",
          date: `${year}-03-02`,
          time: "19:00",
          place: "Harbour Arts Centre",
        },
      ],
    };
    let revision = 0;
    let publishedAt: string | null = null;
    const bundle = await build({
      stdin: {
        contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProfileStudio} from './components/creator-profile/studio/profile-studio';createRoot(document.getElementById('root')).render(<ProfileStudio ownerId="share-kit-fixture" />);`,
        resolveDir: resolve("."),
        loader: "tsx",
      },
      jsx: "automatic",
      bundle: true,
      write: false,
      outfile: "/tmp/missa-share-kit-client.js",
      platform: "browser",
      format: "iife",
      loader: { ".css": "css" },
      define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
    });
    const shell = await (
      await page.request.get("/design-system/creator-profile-settings")
    ).text();
    const styles = (
      shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g) ?? []
    ).join("");
    await page.route("**/portfolio-client-test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><head>${styles}</head><body><div id="root"></div></body></html>`,
      }),
    );
    await page.route("**/api/creator/portfolio-draft", async (route) => {
      if (route.request().method() === "PUT") {
        draft = route.request().postDataJSON().draft;
        revision++;
        await route.fulfill({ json: { revision } });
      } else await route.fulfill({ json: { draft, revision, publishedAt } });
    });
    await page.route("**/api/me/handles/availability?**", (route) =>
      route.fulfill({ json: { available: true } }),
    );
    await page.route("**/api/me/handles", (route) =>
      route.fulfill({
        json: { handle: { handleKey: "maya-b", displayHandle: "maya-b" } },
      }),
    );
    await page.route("**/api/creator/portfolio-publish", async (route) => {
      publishedAt = new Date().toISOString();
      await route.fulfill({ json: { publishedAt, href: "/@maya-b" } });
    });
    await page.route("**/api/creator/portfolio-outcomes", (route) =>
      route.fulfill({ json: { outcomes: [] } }),
    );
    // The live image routes need a database; a one-pixel PNG stands in.
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const imageRequests: string[] = [];
    await page.route(/\/@maya-b\/(share|story)\.png/, (route) => {
      imageRequests.push(route.request().url());
      return route.fulfill({ contentType: "image/png", body: pixel });
    });
    await page.goto("/portfolio-client-test");
    await page.addStyleTag({
      content: bundle.outputFiles.find((file) => file.path.endsWith(".css"))!
        .text,
    });
    await page.addScriptTag({
      content: bundle.outputFiles.find((file) => file.path.endsWith(".js"))!
        .text,
    });
    const rail = page.getByRole("navigation", { name: "Profile editor" });
    const editor = page.getByRole("region", { name: "Edit section" });
    await expect(page.getByRole("status").first()).toContainText(
      "private draft in your account",
    );

    // Not published yet: the panel offers Publish, and Publish works from it.
    await rail.getByRole("button", { name: "Share kit" }).click();
    await expect(
      editor.getByText("Your share kit appears when you publish"),
    ).toBeVisible();
    expect(imageRequests).toHaveLength(0);
    await editor.getByRole("button", { name: "Publish profile" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "usemissa.com/@maya-b",
    );
    await page.getByRole("button", { name: "Confirm and publish" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Published: the kit is drawn from the claimed handle.
    await expect(
      editor.getByRole("img", { name: "Link card for Maya Bennett" }),
    ).toBeVisible();
    await expect(
      editor.getByText("Showing your last published version"),
    ).toHaveCount(0);
    await expect(
      editor.getByRole("link", { name: "Download link card" }),
    ).toHaveAttribute("href", /^\/@maya-b\/share\.png\?v=\d+$/);
    await expect(
      editor.getByRole("link", { name: "Download story" }),
    ).toHaveAttribute("href", /^\/@maya-b\/story\.png\?v=\d+$/);
    await expect(
      editor.getByRole("link", {
        name: /^Open card for Reading from Tidal glossary/,
      }),
    ).toHaveAttribute("href", "/@maya-b/events/e_1");
    await expect(
      editor.getByRole("textbox", { name: "Profile link" }),
    ).toHaveValue(/\/@maya-b$/);
    await axe(page, '[aria-label="Edit section"]');

    // An edit afterwards: the kit still shows what was published.
    await rail.getByRole("button", { name: "Basics" }).click();
    await editor.getByLabel(/^One-line statement/).fill("A new line.");
    await rail.getByRole("button", { name: "Share kit" }).click();
    const notice = editor.getByRole("status").filter({
      hasText: "Showing your last published version",
    });
    await expect(notice).toBeVisible();
    await expect(
      editor.getByRole("img", { name: "Link card for Maya Bennett" }),
    ).toBeVisible();
    await notice.getByRole("button", { name: "Publish changes" }).click();
    await page.getByRole("button", { name: "Confirm and publish" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      editor.getByText("Showing your last published version"),
    ).toHaveCount(0);
    // The pictures are fetched again, at a new address, after a publish.
    await expect.poll(() => new Set(imageRequests).size).toBeGreaterThan(2);
  });
});
