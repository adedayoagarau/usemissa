import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Editor } from "@tiptap/core";
import { exportDocx, type ExportMetadata } from "../lib/writing-export";
import { plainTextToDocument } from "../lib/writing-document";

async function signIn(page: Page) {
  const signup = await page.request.post("/api/auth/signup", { data: { email: `prefs-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`, password: "correct-horse-battery", givenName: "Ada", familyName: "Writer" } });
  expect(signup.status()).toBe(201);
  await page.context().addCookies([{ name: "missa_session", value: signup.headers()["set-cookie"]!.match(/(?:^|,\s*)missa_session=([^;]+)/)![1]!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: "Lax" }]);
}
async function checks(page: Page) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Writing checks…", exact: true }).click();
  return page.getByRole("dialog", { name: "Writing checks", exact: true });
}

test("Harper regional preferences, dictionary and kept wording survive panel reopening", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/doc");
  await page.locator('[data-slot="writing-page-text"]').first().fill("This is an test. This is a mispelled word.");
  let panel = await checks(page);
  await panel.getByLabel("English variety").selectOption("1");
  await panel.getByRole("button", { name: "Check this piece", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Apply replacement a", exact: true })).toBeVisible({ timeout: 60_000 });
  await panel.locator("li").filter({ has: page.getByRole("button", { name: "Apply replacement a", exact: true }) }).getByRole("button", { name: "Keep this wording" }).click();
  await panel.getByRole("button", { name: "Check this piece", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Add to dictionary" }).first()).toBeVisible();
  await panel.getByRole("button", { name: "Add to dictionary" }).first().click();
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  panel = await checks(page);
  await expect(panel.getByLabel("English variety")).toHaveValue("1");
  await expect(panel.getByText(/1 dictionary words/)).toBeVisible();
  await panel.getByRole("button", { name: "Check this piece", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("No remaining suggestions");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // A 195px layout viewport exercises 200% reflow from the 390px mobile viewport.
  await page.setViewportSize({ width: 195, height: 844 });
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(195);
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("DOCX rich import preserves semantic structure and inert markup, export preview reports losses", async ({ page }) => {
  await signIn(page);
  const document = plainTextToDocument("", "literata");
  document.pages[0]!.content.content = [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Imported heading" }] },
    { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }, { type: "text", text: " Bold words", marks: [{ type: "bold" }] }] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "List item" }] }] }] },
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Table cell" }] }] }] }] },
  ];
  const metadata: ExportMetadata = { title: "Rich import", author: "", language: "en", preset: "article", flattenCanvas: false };
  const bytes = await exportDocx(document, metadata);
  await page.goto("/doc");
  if (!await page.getByRole("button", { name: "Export", exact: true }).isVisible()) await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("Choose a file", { exact: true }).setInputFiles({ name: "Rich import.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from(bytes) });
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await expect(editor.locator("h2")).toHaveText("Imported heading");
  await expect(editor.locator("strong")).toHaveText(" Bold words");
  await expect(editor.locator("li")).toHaveText("List item");
  await expect(editor.locator("td, th")).toHaveText("Table cell");
  await expect(editor).toContainText("<script>alert(1)</script>");
  await expect(editor.locator("script")).toHaveCount(0);
  if (!await page.getByRole("button", { name: "Export", exact: true }).isVisible()) await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Export text preview")).toContainText("Imported heading");
  await page.getByLabel("Preview export").selectOption("txt");
  await expect(page.getByText("Plain text omits formatting, tables, images and links.")).toBeVisible();
});


test("selection check limits results to selected text and correction uses mapped document offsets", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/doc");
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await editor.fill("This is an test. This is an test.");
  // Exercise selection mapping with a deterministic ProseMirror range; native keyboard selection has separate editor coverage.
  await editor.evaluate((node) => {
    const instance = (node as HTMLElement & { editor: Editor }).editor;
    instance.commands.focus();
    instance.commands.setTextSelection({ from: 1, to: 17 });
  });
  const selectedText = () => editor.evaluate((node) => {
    const instance = (node as HTMLElement & { editor: Editor }).editor;
    const { from, to } = instance.state.selection;
    return instance.state.doc.textBetween(from, to);
  });
  await expect.poll(selectedText).toBe("This is an test.");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("This is an test.");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect.poll(selectedText).toBe("This is an test.");
  await page.getByRole("menuitem", { name: "Writing checks…", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Writing checks", exact: true });
  await expect(panel).toBeVisible();
  await expect.poll(selectedText).toBe("This is an test.");
  await panel.getByRole("button", { name: "Check selection", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Apply replacement a", exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(panel.locator("li")).toHaveCount(1);
  await panel.getByRole("button", { name: "Apply replacement a", exact: true }).click();
  await expect(editor).toHaveText("This is a test. This is an test.");
});
