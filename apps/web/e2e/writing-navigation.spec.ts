import { expect, test, type Page } from "@playwright/test";
import { newWritingEntryId } from "../lib/writing";
import {
  plainTextToDocument,
  serializeDocument,
} from "../lib/writing-document";
const modifier = process.platform === "darwin" ? "Meta" : "Control";
async function fixture(page: Page) {
  page.on("pageerror", (error) =>
    console.log("Navigation startup error:", error.message),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Navigation render error:", message.text().slice(0, 1500));
  });
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email: `navigation-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      password: "correct-horse-battery",
      givenName: "Adaeze",
      familyName: "Writer",
    },
  });
  expect(response.status()).toBe(201);
  const cookie = response
    .headers()
    ["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  await page.context().addCookies([
    {
      name: "missa_session",
      value: cookie!,
      url: new URL(response.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const id = newWritingEntryId();
  const doc = plainTextToDocument("Original paragraph", "newsreader");
  doc.pages[0].content.content!.push(
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Chapter two" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Second paragraph" }],
    },
  );
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Original",
          body: "Original paragraph",
          document: serializeDocument(doc),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toBeVisible();
  return id;
}
async function openSessions(page: Page) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  const entry = page.getByRole("menuitem", {
    name: "Writing sessions and starting guides",
    exact: true,
  });
  await expect(entry).toBeVisible();
  await entry.focus();
  await page.keyboard.press("Enter");
  return page.getByRole("dialog", { name: "Writing sessions", exact: true });
}
test("keyboard heading and bookmark navigation restore editor focus and survive reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await fixture(page);
  await expect(page.locator('[data-slot="writing-page-text"] h2')).toHaveText(
    "Chapter two",
  );
  await page.keyboard.press(`${modifier}+Shift+k`);
  let palette = page.getByRole("dialog", {
    name: "Navigate document",
    exact: true,
  });
  await expect(palette).toBeVisible();
  await palette
    .getByPlaceholder("Find a heading or command…")
    .fill("Chapter two");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(palette).not.toBeVisible();
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Navigate document", exact: true })
    .click();
  palette = page.getByRole("dialog", {
    name: "Navigate document",
    exact: true,
  });
  await palette
    .getByRole("option", { name: "Bookmark current paragraph", exact: true })
    .click();
  await expect(
    palette.getByRole("group", { name: "Bookmarks", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await page
    .getByRole("button", { name: "Navigate document", exact: true })
    .click();
  palette = page.getByRole("dialog", {
    name: "Navigate document",
    exact: true,
  });
  await expect(
    palette.getByRole("group", { name: "Bookmarks", exact: true }),
  ).toContainText("Chapter two");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: "/tmp/missa-document-navigation.png" });
  await palette
    .getByRole("group", { name: "Bookmarks", exact: true })
    .getByRole("option")
    .first()
    .click();
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toBeFocused();
});
test("writing sessions are optional, revision history reloads and guides create separate pieces on mobile", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const original = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let sheet = await openSessions(page);
  await expect(
    sheet.getByRole("button", { name: "Start revision session", exact: true }),
  ).not.toBeVisible();
  await sheet
    .getByRole("checkbox", {
      name: "Keep a personal writing history",
      exact: true,
    })
    .check();
  await sheet
    .getByLabel("This week’s intention", { exact: true })
    .fill("Revise the opening");
  await sheet
    .getByRole("checkbox", {
      name: "A small celebration when I mark a milestone",
      exact: true,
    })
    .check();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sheet
    .getByRole("button", { name: "Mark a draft finished", exact: true })
    .click();
  await expect(
    page.getByText("One draft finished. Well done.", { exact: true }),
  ).toBeVisible();

  await sheet
    .getByRole("button", { name: "Start revision session", exact: true })
    .click();
  await expect(sheet.getByRole("status")).toContainText("Revision session");
  await sheet.getByRole("button", { name: "End session", exact: true }).click();
  await expect(sheet).toContainText("revision ·");
  await page.keyboard.press("Escape");
  await page.reload();
  sheet = await openSessions(page);
  await expect(
    sheet.getByLabel("This week’s intention", { exact: true }),
  ).toHaveValue("Revise the opening");
  await expect(sheet).toContainText("revision ·");
  expect(
    await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/missa-writing-sessions-mobile.png" });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  await sheet.getByRole("button", { name: "Start essay", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("entry"))
    .not.toBe(original);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("Working question");
  await page.goto(`/doc?entry=${original}`);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("Original paragraph");
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).not.toContainText("Working question");
});
