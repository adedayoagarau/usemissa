import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { newWritingEntryId } from "../lib/writing";
import { newWritingProjectId } from "../lib/writing-projects";
import {
  plainTextToDocument,
  serializeDocument,
} from "../lib/writing-document";
async function setup(page: Page) {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `research-links-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
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
  const projectId = newWritingProjectId();
  expect(
    (
      await page.request.post("/api/me/writing/projects", {
        data: { id: projectId, title: "Linked project", template: "blank" },
      })
    ).status(),
  ).toBe(201);
  const sourceId = newWritingEntryId(),
    targetId = newWritingEntryId(),
    sectionId = "section_cccccccc-cccc-cccc-cccc-cccccccccccc";
  for (const [id, title, text] of [
    [sourceId, "Source piece", "A source paragraph."],
    [targetId, "Target piece", "A target paragraph."],
  ] as const) {
    const doc = plainTextToDocument(text, "newsreader");
    if (id === targetId)
      doc.pages[0].content.content!.push({
        type: "heading",
        attrs: { level: 2, sectionId },
        content: [{ type: "text", text: "Stable heading" }],
      });
    expect(
      (
        await page.request.put(`/api/me/writing/${id}`, {
          data: {
            title,
            body: text,
            document: serializeDocument(doc),
            baseRevision: 0,
            projectId,
          },
        })
      ).status(),
    ).toBe(200);
  }
  await page.goto(`/doc?entry=${sourceId}`);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("A source paragraph.");
  return { sourceId, targetId, sectionId, projectId };
}

test("Zotero import explicitly selects a reference without changing the draft", async ({
  page,
}) => {
  const { sourceId, projectId } = await setup(page);
  const consent = page.getByRole("region", { name: "Analytics consent", exact: true });
  if (await consent.isVisible()) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await expect.poll(() => consent.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const button of await consent.getByRole("button").all()) {
      const bounds = await button.boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    }
    await consent.getByRole("button", { name: "Decline", exact: true }).click();
    await page.evaluate(() => { document.documentElement.style.zoom = "1"; });
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await page.route("**/api/me/writing/zotero**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      expect(body.apiKey).toBe("EXAMPLEKEY12345678");
      await route.fulfill({ json: { connected: true, userId: "1234" } });
      return;
    }
    if (request.url().includes("status=1")) {
      await route.fulfill({ json: { connected: false } });
      return;
    }
    await route.fulfill({
      json: {
        connected: true,
        sources: [
          {
            id: "zotero_1234_ABCD1234",
            title: "Actual reference title",
            sourceType: "book",
            author: "Ada Writer",
            publicationDate: "2025",
          },
          {
            id: "zotero_1234_LONG1234",
            title: "A long reference title " + "manuscript".repeat(15),
            sourceType: "book",
            author: "A researcher with a long name and several collaborators",
          },
        ],
        nextStart: null,
      },
    });
  });
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page
    .getByRole("button", { name: "Project workspace", exact: true })
    .click();
  await page
    .getByRole("complementary", {
      name: "Linked project · project tools",
      exact: true,
    })
    .getByRole("tab", { name: "Research", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import from Zotero", exact: true })
    .click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Zotero references",
      exact: true,
    }),
  });
  await dialog.getByLabel("Zotero user ID", { exact: true }).fill("1234");
  await dialog
    .getByLabel("Dedicated API key", { exact: true })
    .fill("EXAMPLEKEY12345678");
  await dialog
    .getByRole("button", { name: "Connect Zotero", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  // ResizeObserver applies the zoom-aware geometry on the next layout turn.
  // Assert settled visible bounds, rather than a frame from before the resize.
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect.poll(async () => { const bounds = await dialog.boundingBox(); return bounds?.x ?? -1; }).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => { const bounds = await dialog.boundingBox(); return bounds ? bounds.x + bounds.width : Infinity; }).toBeLessThanOrEqual(390);
  await expect.poll(async () => { const bounds = await dialog.boundingBox(); return bounds?.y ?? -1; }).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => { const bounds = await dialog.boundingBox(); return bounds ? bounds.y + bounds.height : Infinity; }).toBeLessThanOrEqual(844);
  await dialog
    .getByRole("button", { name: "Browse references", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await dialog
    .getByRole("checkbox", { name: "Actual reference title", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Import selected (1)", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "1 references imported",
  );
  await dialog.getByRole("button", { name: "Close", exact: true }).scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include('[data-slot="dialog-content"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: "/tmp/missa-release-zotero-mobile-zoom.png" });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => { document.body.style.zoom = "1"; });
  await page
    .getByRole("button", { name: "Save notes and plans", exact: true })
    .click();
  await expect
    .poll(async () =>
      JSON.stringify(
        (
          await (
            await page.request.get(
              `/api/me/writing/projects/${projectId}/studio`,
            )
          ).json()
        ).studio.data.research,
      ),
    )
    .toContain("Actual reference title");
  const original = (
    await (await page.request.get(`/api/me/writing/${sourceId}`)).json()
  ).entry;
  expect(original.body).toBe("A source paragraph.");
  await page.getByRole("complementary", { name: "Linked project · project tools", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const overflow = await page.evaluate(() => [...document.querySelectorAll("header, footer, main, header button, footer button")].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1).map(element => ({ tag: element.tagName, text: element.textContent?.slice(0, 80), right: element.getBoundingClientRect().right })));
  expect(overflow).toEqual([]);
  await expect(page.locator('[data-ending-style]')).toHaveCount(0);
  const documentLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth, overflow: [...document.querySelectorAll("body *")].filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.right > window.innerWidth + 1 && getComputedStyle(element).visibility !== "hidden"; }).map(element => ({ tag: element.tagName, className: element.getAttribute("class")?.slice(0, 160), text: element.textContent?.slice(0, 60), right: element.getBoundingClientRect().right })).slice(0, 20) }));
  expect(documentLayout.scrollWidth, JSON.stringify(documentLayout)).toBeLessThanOrEqual(documentLayout.width);
  await page.screenshot({ path: "/tmp/missa-release-doc-mobile-zoom.png" });
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) =>
        String(value).includes("EXAMPLEKEY12345678"),
      ),
    ),
  ).toBe(false);
});

test("Zotero connection routes enforce account authentication and origin before credential handling", async ({
  page,
  request,
}) => {
  const unauthenticated = await request.get("/api/me/writing/zotero?status=1");
  expect(unauthenticated.status()).toBe(401);
  await setup(page);
  const crossSite = await page.request.post("/api/me/writing/zotero", {
    headers: { Origin: "https://other.example" },
    data: { userId: "1234", apiKey: "EXAMPLEKEY12345678" },
  });
  expect(crossSite.status()).toBe(403);
  const missingOrigin = await page.request.delete("/api/me/writing/zotero");
  expect(missingOrigin.status()).toBe(403);
  const origin = new URL(page.url()).origin;
  const invalid = await page.request.post("/api/me/writing/zotero", {
    headers: { Origin: origin },
    data: { userId: "../groups/1", apiKey: "not-valid" },
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.text()).not.toContain("not-valid");
});
