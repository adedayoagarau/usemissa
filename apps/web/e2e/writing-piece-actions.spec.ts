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
  return { sourceId, targetId, sectionId };
}

test("binder details preserve text and duplicate creates a separate piece", async ({
  page,
}) => {
  const { sourceId } = await setup(page);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page
    .getByRole("button", { name: "Options for Source piece", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Piece details", exact: true })
    .click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Piece details", exact: true }),
  });
  await dialog.getByLabel("Title", { exact: true }).fill("Renamed source");
  await expect(dialog.getByLabel("Title", { exact: true })).toBeEnabled();
  await dialog.getByLabel("Status", { exact: true }).selectOption("revised");
  await dialog
    .getByRole("checkbox", {
      name: "Exclude from manuscript export",
      exact: true,
    })
    .check();
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Options for Renamed source",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/me/writing/${sourceId}`)).json())
          .entry.title,
    )
    .toBe("Renamed source");
  const response = await page.request.get(`/api/me/writing/${sourceId}`);
  const record = await response.json();
  expect(record.entry.title).toBe("Renamed source");
  expect(record.entry.status).toBe("revised");
  expect(JSON.parse(record.entry.document).purpose).toBe("research");
  expect(record.entry.body).toBe("A source paragraph.");
  const originalDocument = record.entry.document;
  await page
    .getByRole("button", { name: "Options for Renamed source", exact: true })
    .click();
  const copied = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/me\/writing\/writing_/.test(response.url()) &&
      !response.url().endsWith(sourceId),
  );
  await page
    .getByRole("menuitem", { name: "Duplicate piece", exact: true })
    .click();
  const copySummary = (await (await copied).json()).entry;
  const copy = (
    await (await page.request.get(`/api/me/writing/${copySummary.id}`)).json()
  ).entry;
  expect(copy.id).not.toBe(sourceId);
  expect(copy.title).toBe("Renamed source — copy");
  expect(copy.body).toBe(record.entry.body);
  expect(copy.document).toBe(originalDocument);
  const original = (
    await (await page.request.get(`/api/me/writing/${sourceId}`)).json()
  ).entry;
  expect(original.title).toBe("Renamed source");
  expect(original.document).toBe(originalDocument);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("A source paragraph.");
});

test("background save preserves a title being edited in piece details", async ({ page }) => {
  const { sourceId } = await setup(page);
  let releaseSave!: () => void;
  const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
  let savedOnServer!: () => void;
  const savedRequest = new Promise<void>(resolve => { savedOnServer = resolve; });
  let detailsReads = 0;
  let gated = false;
  await page.route(`**/api/me/writing/${sourceId}`, async route => {
    if (route.request().method() === "GET") {
      detailsReads++;
      await route.continue();
      return;
    }
    if (route.request().method() === "PUT" && !gated) {
      gated = true;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      savedOnServer();
      await saveGate;
      await route.fulfill({ response });
      return;
    }
    await route.continue();
  });
  await page.locator('[data-slot="writing-page-text"]').first().fill("A background edit.");
  await savedRequest;
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Options for Source piece", exact: true }).click();
  await page.getByRole("menuitem", { name: "Piece details", exact: true }).click();
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Piece details", exact: true }) });
  const title = dialog.getByLabel("Title", { exact: true });
  await expect(title).toBeEnabled();
  await title.fill("Title typed while saving");
  const initialDetailsReads = detailsReads;
  const completedSave = page.waitForResponse(response => response.url().endsWith(`/api/me/writing/${sourceId}`) && response.request().method() === "PUT");
  releaseSave();
  await completedSave;
  await expect(page.locator("footer").getByText("Saved to account", { exact: true })).toHaveText("Saved to account");
  // Drain the render/effect turns caused by the acknowledgement. A details
  // refetch here would overwrite the local title with the server's old title.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(detailsReads).toBe(initialDetailsReads);
  await expect(title).toHaveValue("Title typed while saving");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => (await (await page.request.get(`/api/me/writing/${sourceId}`)).json()).entry.title).toBe("Title typed while saving");
  const entry = (await (await page.request.get(`/api/me/writing/${sourceId}`)).json()).entry;
  expect(entry.body).toBe("A background edit.");
});
