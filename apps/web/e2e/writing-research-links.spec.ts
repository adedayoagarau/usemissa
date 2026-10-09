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
  await page
    .context()
    .addCookies([
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
  return { sourceId, targetId, sectionId };
}
async function research(page: Page) {
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page
    .getByRole("button", { name: "Project workspace", exact: true })
    .click();
  const tools = page.getByRole("complementary", {
    name: "Linked project · project tools",
    exact: true,
  });
  await tools.getByRole("tab", { name: "Research", exact: true }).click();
  return tools.getByRole("region", { name: "Research", exact: true });
}
test("piece and heading picker inserts real links and derives project backlinks", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const { sourceId, targetId, sectionId } = await setup(page);
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await editor.click();
  await editor.press("End");
  const panel = await research(page);
  await panel
    .getByLabel("Find a piece or heading", { exact: true })
    .fill("Stable heading");
  await panel
    .getByLabel("Link destination", { exact: true })
    .selectOption(`/doc?entry=${targetId}#${sectionId}`);
  await panel
    .getByRole("button", { name: "Insert piece link", exact: true })
    .click();
  await expect(
    editor.locator(`a[href="/doc?entry=${targetId}#${sectionId}"]`),
  ).toHaveText("Target piece · Stable heading");
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/me/writing/${sourceId}`);
      return (r.ok() ? (await r.json()).entry.document : "").includes(
        sectionId,
      );
    })
    .toBe(true);
  await page.goto(`/doc?entry=${targetId}`);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("A target paragraph.");
  const back = await research(page);
  await expect(back).toContainText("Linked from (1)");
  await expect(
    back.getByRole("button", {
      name: "Source piece · 1 heading link",
      exact: true,
    }),
  ).toBeVisible();
});
test("local CSL preview uses checked names and dates without fetching source links", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await setup(page);
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("citation-unrequested.invalid"))
      outgoing.push(request.url());
  });
  const panel = await research(page);
  await panel.getByRole("button", { name: "Add source", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit source", exact: true });
  await dialog.getByLabel("Title", { exact: true }).fill("A real source");
  await dialog
    .getByLabel("Author family name (optional)", { exact: true })
    .fill("Writer");
  await dialog
    .getByLabel("Author given name (optional)", { exact: true })
    .fill("Ada");
  await dialog
    .getByLabel("Publication date (YYYY-MM-DD)", { exact: true })
    .fill("2026-02-30");
  await dialog
    .getByLabel("Source link", { exact: true })
    .fill("https://citation-unrequested.invalid/source");
  await dialog
    .getByRole("button", { name: "Format citation and footnote", exact: true })
    .click();
  await expect(dialog.getByLabel("Footnote text", { exact: true })).toHaveValue(
    /A real source/,
  );
  await expect(dialog.getByLabel("Footnote text", { exact: true })).toHaveValue(
    /Writer/,
  );
  await expect(dialog).toContainText("Publication date was left out");
  expect(outgoing).toEqual([]);
  await dialog
    .getByRole("button", { name: "Save source", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(panel).toContainText("A real source");
});
