import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createProjectBackup,
  prepareProjectRestore,
} from "../lib/writing-project-backup";
import { plainTextToDocument } from "../lib/writing-document";
import { EMPTY_STUDIO } from "../lib/writing-studio-data";
import { newWritingEntryId } from "../lib/writing";
import { newWritingProjectId } from "../lib/writing-projects";
test("whole project restores separately, retains private notes, retries safely and refuses overwrite", async ({
  page,
}) => {
  test.setTimeout(90000);
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `restore-${Date.now()}@example.com`,
      password: "correct-horse-battery",
      givenName: "Ada",
      familyName: "Writer",
    },
  });
  expect(signup.status()).toBe(201);
  await page.context().addCookies([
    {
      name: "missa_session",
      value: signup
        .headers()
        ["set-cookie"]!.match(/(?:^|,\s*)missa_session=([^;]+)/)![1]!,
      url: new URL(signup.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const id = newWritingEntryId();
  const now = new Date().toISOString();
  const notes = JSON.stringify({
    version: 1,
    suggestions: [],
    comments: [],
    cuttings: [{ id: "cut", text: "Keep this private", createdAt: now }],
  });
  const backup = createProjectBackup(
    {
      id: newWritingProjectId(),
      title: "Restored test",
      template: "novel",
      plan: { plotlines: [] },
      createdAt: now,
      updatedAt: now,
    },
    [
      {
        id,
        title: "First chapter",
        doc: plainTextToDocument("A restored chapter.", "literata"),
      },
    ],
    structuredClone(EMPTY_STUDIO),
    { [id]: notes },
  );
  await page.goto("/doc");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore project", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Restore a project backup" });
  await panel.getByLabel("Choose a whole-project backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("bad"),
  });
  await expect(
    panel.getByText("This file is not a readable Missa project backup."),
  ).toBeVisible();
  await panel.getByLabel("Choose a whole-project backup").setInputFiles({
    name: "project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    panel.getByRole("heading", { name: "Restored test (restored)" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 195, height: 844 });
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(195);
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Restore project", exact: true })
    .click();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/projects/restore") && r.method() === "POST",
  );
  await panel
    .getByRole("button", { name: "Restore as a separate project" })
    .click();
  const payload = (await request).postDataJSON();
  expect(payload.deviceRevisions).toEqual({});
  await expect(panel.getByRole("status")).toContainText("Project restored");
  const savedNotes = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([key]) => key.includes("revision-tools:"))
      .map(([, value]) => value),
  );
  expect(savedNotes).toContain(notes);
  const replay = await page.request.post("/api/me/writing/projects/restore", {
    data: payload,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).replayed).toBe(true);
  const changed = structuredClone(payload);
  changed.pieces[0].title = "Overwrite";
  expect(
    (
      await page.request.post("/api/me/writing/projects/restore", {
        data: changed,
      })
    ).status(),
  ).toBe(409);
  const collision = prepareProjectRestore(backup);
  collision.deviceRevisions = {};
  collision.pieces = [
    { ...collision.pieces[0]!, id: newWritingEntryId() },
    { ...collision.pieces[0]!, id: payload.pieces[0].id },
  ];
  expect(
    (
      await page.request.post("/api/me/writing/projects/restore", {
        data: collision,
      })
    ).status(),
  ).toBe(409);
  const projects = await page.request.get("/api/me/writing/projects");
  expect(
    (await projects.json()).projects.some(
      (item: { id: string }) => item.id === collision.project.id,
    ),
  ).toBe(false);
  const malformed = prepareProjectRestore(backup);
  malformed.pieces[0]!.document = "not a document";
  expect(
    (
      await page.request.post("/api/me/writing/projects/restore", {
        data: malformed,
      })
    ).status(),
  ).toBe(400);
  await panel.getByRole("button", { name: "Open restored project" }).click();
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("A restored chapter.");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
