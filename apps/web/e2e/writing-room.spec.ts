import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Locator } from "@playwright/test";
import pg from "pg";
import { newWritingProjectId } from "../lib/writing-projects";
import { newWritingEntryId } from "../lib/writing";
import { plainTextToDocument, serializeDocument } from "../lib/writing-document";

// Relational only: entries are saved to the account in Postgres (migrations 0095 to 0099).

const modifier = process.platform === "darwin" ? "Meta" : "Control";
// Collapse the editor's actual select-all range: native Home/End differ on macOS.
async function moveDocumentCursor(page: Page, edge: "start" | "end") {
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press(edge === "start" ? "ArrowLeft" : "ArrowRight");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.isCollapsed)).toBe(true);
  // ProseMirror reads native arrow selections asynchronously; wait for its footer state too.
  await expect(page.getByRole("button", { name: /words selected.*Word count/u, includeHidden: true })).toHaveCount(0);
}

const pageText = (page: Page, index = 0) =>
  page.locator('[data-slot="writing-page-text"]').nth(index);

test("Lock in keeps the draft editable and saved, pauses, and exits with Escape", async ({ page }) => {
  await signIn(page);
  await page.goto("/doc");
  await pageText(page).fill("A focused draft.");
  await expect(page.getByRole("button", { name: "Formatting", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toBeHidden();
  await page.clock.install();
  await page.getByRole("button", { name: "Lock in", exact: true }).click();
  const session = page.getByRole("region", { name: "Lock in session", exact: true });
  await expect(session).toBeVisible();
  await session.getByRole("button", { name: "Timer length", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "5 minutes", exact: true }).click();
  await session.getByRole("button", { name: "Timer length", exact: true }).click();
  await page.clock.runFor(500);
  await page.clock.resume();
  await expect(session.getByRole("button", { name: "Start 5-minute timer (5:00)", exact: true })).toBeVisible();
  await session.getByRole("button", { name: "Start 5-minute timer (5:00)", exact: true }).click();
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.locator("footer")).toBeVisible();
  await expect(pageText(page)).toBeFocused();
  await pageText(page).pressSequentially(" The same page, with room to think.");
  await expect(session.getByRole("status")).toHaveText("Saved to account");
  const entryId = new URL(page.url()).searchParams.get("entry");
  await expect.poll(async () => (await (await page.request.get(`/api/me/writing/${entryId}`)).json()).entry.body).toContain("room to think");
  await session.getByRole("button", { name: /^Pause timer/ }).click();
  const clock = session.getByRole('button', { name: /timer.*\(/ });
  const paused = await clock.textContent();
  await page.waitForTimeout(1100);
  await expect(clock).toHaveText(paused!);
  await session.getByRole("button", { name: /^Resume timer/ }).click();
  await expect(session.getByRole("button", { name: /^Pause timer/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.clock.fastForward(15 * 60_000);
  await expect(session.getByRole("status")).toHaveText("Session complete. Keep writing if you like.");
  await expect(pageText(page)).toContainText("room to think");
  await session.getByRole("button", { name: /^Restart .*timer/ }).click();
  await expect(session.getByRole("button", { name: /^Pause timer/ })).toBeVisible();
  await pageText(page).press("Escape");
  await expect(session).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lock in", exact: true })).toBeVisible();
  await expect(pageText(page)).toContainText("room to think");
});

test("highlight speaker reads only the selected passage without a range form", async ({ page }) => {
  await signIn(page);
  await page.goto("/doc");
  const text = pageText(page);
  await text.fill("Alpha. Middle. Omega.");
  const requests: string[] = [];
  await page.route("**/api/me/writing/read-aloud", async route => {
    requests.push(route.request().postDataJSON().text);
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Test boundary captured" }) });
  });
  async function selectMiddle() {
    await text.focus();
    await text.evaluate(element => {
      const node = element.querySelector("p")!.firstChild!;
      const range = window.document.createRange(); range.setStart(node, 7); range.setEnd(node, 14);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      window.document.dispatchEvent(new Event("selectionchange"));
    });
  }
  await selectMiddle();
  const speaker = page.getByRole("toolbar", {name:"Selection formatting"}).getByRole("button", {name:"Read selection aloud"});
  await expect(speaker).toBeVisible();
  expect(requests).toHaveLength(0);
  await speaker.click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toBe("Middle.");
  await expect(page.getByLabel("Read from and stop at")).toHaveCount(0);
  await expect(page.getByText("Test boundary captured")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:"reduce"});
  await selectMiddle();
  await expect(speaker).toBeVisible();
  const toolbar = page.getByRole("toolbar", { name: "Selection formatting" });
  const bounds = await toolbar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:"/tmp/missa-highlight-speaker-mobile.png"});
  expect((await new AxeBuilder({page}).include('[aria-label="Selection formatting"]').analyze()).violations).toEqual([]);
  await speaker.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toBe("Middle.");
});

test("read aloud follows Free, Plus and Pro tiers and sends text only on Read", async ({ page }) => {
  const email = await signIn(page);
  await page.goto("/doc");
  await pageText(page).fill("A quiet room. A new beginning.");
  const dialog = page.getByRole("group", { name: "Read aloud", exact: true });
  await dialog.getByRole("button", { name: "Read-aloud settings" }).click();
  await expect(page.getByText(/characters per month with Free/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog.getByRole("button", { name: "Read aloud", exact: true })).toBeEnabled();
  await expect.poll(async () => (await (await page.request.get("/api/me/writing")).json()).entries.length).toBeGreaterThan(0);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("insert into creator_plans(account_id,plan) select id,'plus' from radar_accounts where lower(email)=lower($1)", [email]);
  } finally { await client.end(); }
  await page.reload();
  await expect(pageText(page)).toHaveAttribute("contenteditable", "true");
  await pageText(page).fill("A quiet room. A new beginning.");
  // A real, silent WAV exercises browser playback without calling a paid provider.
  const wav = Buffer.alloc(44 + 16_000 * 2 * 5);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16_000, 24); wav.writeUInt32LE(32_000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);
  const requests: { text: string; voice: string }[] = [];
  await page.route("**/api/me/writing/read-aloud", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "audio/wav", body: wav });
  });
  await expect(dialog.getByRole("button", { name: "Read-aloud settings" })).toBeVisible();
  await expect(page.getByRole("menu", { name: "More", exact: true })).toBeHidden();
  await page.screenshot({ path: "/tmp/missa-read-aloud-paid.png" });
  expect(requests).toHaveLength(0);
  await dialog.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pause read aloud", exact: true })).toBeVisible();
  expect(requests).toEqual([{ text: "A quiet room. A new beginning.", voice: "af_heart" }]);
  await dialog.getByRole("button", { name: "Pause read aloud", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Paused");
  await dialog.getByRole("button", { name: "Read-aloud settings" }).click();
  await page.getByLabel("Speed", { exact: true }).selectOption("1.5");
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Resume read aloud", exact: true }).click();
  await dialog.getByRole("button", { name: "Stop read aloud", exact: true }).click();
  await dialog.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pause read aloud", exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole("button", { name: "Lock in", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pause read aloud", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Leave Lock in", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Pause read aloud", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Stop read aloud", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('div[role="group"][aria-label="Read aloud"]').analyze()).violations).toEqual([]);
  await expect(pageText(page)).toHaveText("A quiet room. A new beginning.");
  await page.setViewportSize({ width: 1280, height: 900 });
  await pageText(page).focus();
  await pageText(page).evaluate((element) => {
    const text = element.querySelector("p")?.firstChild;
    if (!text) throw new Error("Missing draft text");
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 7);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("A quiet");
  await page.unroute("**/api/me/writing/read-aloud");
  await page.route("**/api/me/writing/read-aloud", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Read aloud is not available yet. Try again later." }) });
  });
  // The development-only Next indicator sits in the corner the zoomed bar reaches; production has none.
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await dialog.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Read aloud" })).toHaveText("Read aloud is not available yet. Try again later.");
  expect(requests.at(-1)?.text).toBe("A quiet");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = "1"; });
  const proClient = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await proClient.connect();
  try { await proClient.query("update creator_plans set plan='pro' where account_id=(select id from radar_accounts where lower(email)=lower($1))", [email]); }
  finally { await proClient.end(); }
  await page.reload();
  await expect(pageText(page)).toHaveAttribute("contenteditable", "true");
  await dialog.getByRole("button", { name: "Read-aloud settings" }).click();
  await expect(page.getByText("Unlimited read aloud with Pro. Fair-use rate limits apply.", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("Harper checks on request and applies an undoable correction locally", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const harperRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/harper/")) harperRequests.push(request.url()); });
  await page.goto("/doc");
  const writing = pageText(page);
  await expect(writing).toBeVisible();
  await writing.fill("😀 This is an test.");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Writing checks…", exact: true }).click();
  const checks = page.getByRole("dialog", { name: "Writing checks", exact: true });
  await expect(checks).toBeVisible();
  expect(harperRequests).toEqual([]);
  await checks.getByRole("button", { name: "Check this piece", exact: true }).click();
  await expect(checks.getByRole("button", { name: "Apply replacement a", exact: true })).toBeVisible({ timeout: 60_000 });
  expect(harperRequests.length).toBeGreaterThan(0);
  expect(harperRequests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  await checks.getByRole("button", { name: "Apply replacement a", exact: true }).click();
  await expect(writing).toHaveText("😀 This is a test.");
  await checks.getByRole("button", { name: "Close", exact: true }).click();
  await writing.focus();
  await writing.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  await expect(writing).toHaveText("😀 This is an test.");
});

test("Harper reports a failed first download without changing the draft", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.route("**/harper/**/*.wasm", (route) => route.abort());
  await page.goto("/doc");
  const writing = pageText(page);
  await writing.fill("This is an test.");
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Writing checks…", exact: true }).click();
  const checks = page.getByRole("dialog", { name: "Writing checks", exact: true });
  await checks.getByRole("button", { name: "Check this piece", exact: true }).click();
  await expect(checks.getByRole("alert")).toContainText("Your writing is safe", { timeout: 40_000 });
  await expect(writing).toHaveText("This is an test.");
});

test("project studio saves combined drafts, research, checkpoints and scoped reader feedback", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const projectId = newWritingProjectId();
  expect((await page.request.post("/api/me/writing/projects", { data: { id: projectId, title: "Public rooms", template: "blank" } })).status()).toBe(201);
  const ids = [newWritingEntryId(), newWritingEntryId()];
  for (const [index, id] of ids.entries()) {
    const text = index === 0 ? "A public room begins with a promise." : Array(30).fill("The opening hours decide who can stay. A long draft must remain readable as the project grows.").join("\n\n");
    const title = index === 0 ? "Section 1" : "A longer section title about public rooms, opening hours, access and the promises that shape a shared space";
    expect((await page.request.put(`/api/me/writing/${id}`, { data: { title, body: text, document: serializeDocument(plainTextToDocument(text, "newsreader")), baseRevision: 0, projectId } })).status()).toBe(200);
  }
  await page.goto(`/doc?entry=${ids[0]}`);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Project workspace", exact: true }).click();
  const studio = page.getByRole("complementary", { name: "Public rooms · project tools", exact: true });
  // Opening tools must preserve the original editor and its controls, without a modal.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Section 1");
  await page.getByRole("main").locator('[data-slot="writing-page-text"]').first().fill("A public room begins with a promise, still on the original page.");
  await expect.poll(async () => (await (await page.request.get(`/api/me/writing/${ids[0]}`)).json()).entry.body).toBe("A public room begins with a promise, still on the original page.");
  await expect(studio.getByRole("button", { name: "Save notes and plans", exact: true })).toBeVisible();
  await studio.getByRole("button", { name: "Edit manuscript together", exact: true }).click();
  const manuscript = page.getByRole("main");
  await expect(manuscript.locator("[data-manuscript-piece]")).toHaveCount(2);
  const draft = manuscript.locator(`[data-manuscript-piece="${ids[0]}"] [data-slot="writing-page-text"]`).first();
  await draft.fill("A public room begins with a concrete promise.");
  await expect.poll(async () => (await (await page.request.get(`/api/me/writing/${ids[0]}`)).json()).entry.body).toBe("A public room begins with a concrete promise.");
  await page.getByRole("button", { name: "Back to piece", exact: true }).click();
  await studio.getByRole("tab", { name: "Research", exact: true }).click();
  await studio.getByRole("button", { name: "Add source", exact: true }).click();
  const source = page.getByRole("dialog", { name: "Edit source", exact: true });
  await source.getByLabel("Title", { exact: true }).fill("Field notebook");
  await source.getByRole("button", { name: "Save source", exact: true }).click();
  await studio.getByRole("button", { name: "Save notes and plans", exact: true }).click();
  await expect(studio.getByRole("status").filter({ hasText: "Notes and plans saved" })).toBeVisible();
  await studio.getByRole("tab", { name: "Revision & readers", exact: true }).click();
  await studio.getByLabel("Project checkpoint name", { exact: true }).fill("Reading copy");
  await studio.getByRole("button", { name: "Keep checkpoint", exact: true }).click();
  await studio.getByRole("button", { name: "Save notes and plans", exact: true }).click();
  await expect(studio.getByRole("button", { name: "Create reader link", exact: true })).toBeEnabled();
  await studio.getByRole("button", { name: "Create reader link", exact: true }).click();
  await expect(studio.getByLabel("Reader link — copy and share when ready", { exact: true })).toBeVisible();
  const readerLink = await studio.getByLabel("Reader link — copy and share when ready", { exact: true }).inputValue();
  const token = readerLink.split("/").at(-1)!;
  const reader = await page.context().newPage();
  await reader.goto(readerLink);
  await reader.getByLabel("Passage", { exact: true }).fill("concrete promise");
  await reader.getByLabel("Comment", { exact: true }).fill("This detail makes the opening clearer.");
  await reader.getByRole("button", { name: "Leave comment", exact: true }).click();
  await expect(reader.getByRole("status")).toHaveText("Comment saved. The author decides how to use it.");
  await studio.getByRole("button", { name: "Read feedback", exact: true }).click();
  await expect(studio.getByRole("region", { name: "Reader feedback", exact: true })).toContainText("This detail makes the opening clearer.");
  await expect.poll(async () => (await (await page.request.get(`/api/me/writing/${ids[0]}`)).json()).entry.body).toBe("A public room begins with a concrete promise.");
  await studio.getByRole("button", { name: "Revoke access", exact: true }).click();
  await expect.poll(async () => (await page.request.get(`/api/writing/read/${token}`)).status()).toBe(404);
  await reader.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await studio.getByRole("tab", { name: "Manuscript", exact: true }).click();
  const dimensions = await studio.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth,
    overflowing: [...element.querySelectorAll("*")].filter((child) => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1).slice(0, 12).map((child) => ({ tag: child.tagName, slot: child.getAttribute("data-slot"), classes: child.className })) }));
  expect(dimensions, JSON.stringify(dimensions)).toMatchObject({ scroll: dimensions.width });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(studio.getByRole("tab", { name: "Manuscript", exact: true })).toBeFocused();
  await studio.getByRole("tab", { name: "Manuscript", exact: true }).press("ArrowRight");
  await expect(studio.getByRole("tab", { name: "Structure", exact: true })).toBeFocused();
  await studio.getByRole("tab", { name: "Structure", exact: true }).press("ArrowLeft");
  expect((await new AxeBuilder({ page }).include('aside[aria-label="Public rooms · project tools"]').analyze()).violations).toEqual([]);
  // 200% zoom-equivalent reflow, including an unusually long piece title.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await expect.poll(async () => studio.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await expect(studio.getByRole("button", { name: "Close", exact: true })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = "1"; });
  await studio.getByRole("tab", { name: "Revision & readers", exact: true }).click();
  await studio.getByRole("button", { name: "Remove checkpoint", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Remove this checkpoint?", exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(studio.getByRole("button", { name: "Remove checkpoint", exact: true })).toBeVisible();
});

// Accessibility scans certify the opened surface, not a blended transition frame.
async function expectSettledOverlay(surface: Locator) {
  await expect(surface).toBeVisible();
  await expect(surface).toHaveCSS("opacity", "1");
  await expect.poll(() => surface.evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) =>
      (animation.playState === "running" || animation.pending) &&
      animation.effect?.getComputedTiming().iterations !== Infinity,
    ).length,
  )).toBe(0);
}

async function showFormatting(page: Page) {
  const trigger = page.getByRole("button", { name: "Formatting", exact: true });
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
}

async function signIn(page: Page) {
  const email = `write-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email,
      password: "correct-horse-battery",
      givenName: "Adaeze",
      familyName: "Writer",
    },
  });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup
    .headers()
    ["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  await page.context().addCookies([
    {
      name: "missa_session",
      value: sessionCookie!,
      url: new URL(signup.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return email;
}

test("signed-out visitors are sent to sign in and back", async ({ page }) => {
  await page.goto("/doc");
  await expect(page).toHaveURL(/\/login\?next=%2Fdoc$/);
});

test("the old /write address opens the writing room at /doc", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/write?entry=writing_00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/doc(?:\?|$)/);
});

test("the writing room saves as you type, reopens entries and deletes them", async ({
  page,
}) => {
  await signIn(page);
  const response = await page.goto("/doc");
  // No browser agent tools where a creator writes.
  expect(response?.headers()["permissions-policy"]).toContain("tools=()");

  const writing = pageText(page);
  await expect(writing).toBeFocused();
  await writing.pressSequentially("The river does not wait for anyone.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  await expect(page.getByText("7 words")).toBeVisible();
  await expect(page).toHaveURL(/\/doc\?entry=writing_/);

  // A reload reopens the saved entry from the account.
  await page.reload();
  await expect(writing).toHaveText("The river does not wait for anyone.");

  // Offline, text stays on the device and is saved once the connection returns.
  await page.context().setOffline(true);
  await writing.click();
  await moveDocumentCursor(page, "end");
  await writing.pressSequentially(" Neither do I.");
  await expect(page.getByRole("button", { name: "Save status: Offline · kept on this device", exact: true })).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  const entryId = new URL(page.url()).searchParams.get("entry")!;
  const stored = (await (
    await page.request.get(`/api/me/writing/${entryId}`)
  ).json()) as { entry: { body: string } };
  expect(stored.entry.body).toBe(
    "The river does not wait for anyone. Neither do I.",
  );

  // A new entry starts blank; the earlier one opens from the library.
  await page.getByRole("button", { name: "New entry" }).click();
  await expect(writing).toHaveText("");
  await expect(writing).toBeFocused();
  await writing.pressSequentially("Second page.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Your writing" });
  await expect(sheet.getByRole("link")).toHaveCount(2);
  await expectSettledOverlay(sheet);
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="sheet-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  // Closing the list returns straight to the page.
  await page.keyboard.press("Escape");
  await expect(writing).toBeFocused();
  await writing.pressSequentially(" More.");
  await expect(sheet).toBeHidden();
  await expect(writing).toHaveText("Second page. More.");
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await sheet.getByRole("link", { name: /The river does not wait/ }).click();
  await expect(writing).toHaveText(
    "The river does not wait for anyone. Neither do I.",
  );
  await expect(writing).toBeFocused();

  // The promise is one click away.
  await page.getByRole("button", { name: "Private" }).click();
  await expect(
    page.getByText(
      "Nothing writes or finishes your words for you.",
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Delete entry…" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete this entry?" });
  await expect(confirm).toContainText("The river does not wait for anyone.");
  await confirm.getByRole("button", { name: "Delete entry" }).click();
  await expect(page.getByText("Entry deleted")).toBeVisible();
  // Let the toast finish entering so contrast is measured at full opacity.
  await expect(page.locator("[data-sonner-toast]")).toHaveCSS("opacity", "1");
  await expect(writing).toHaveText("");
  expect((await page.request.get(`/api/me/writing/${entryId}`)).status()).toBe(
    404,
  );

  await expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
    [],
  );
});

test("the timer counts down and hides the controls until it is paused", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/doc");
  const writing = pageText(page);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Start 15-minute timer" }).click();
  const pause = page.getByRole("button", { name: "Pause timer" });
  await expect(pause).toBeVisible();
  // Started with the pointer, the page takes focus; once the pointer leaves the
  // controls they fade, and hidden controls cannot be clicked by accident.
  await expect(writing).toBeFocused();
  await page.mouse.move(400, 300);
  await expect(page.locator("footer")).toHaveAttribute("data-hidden", "true");
  await expect(page.locator("footer")).toHaveCSS("opacity", "0");
  await expect(pause).toHaveCSS("pointer-events", "none");
  await writing.pressSequentially("Timed words.");
  await expect(page.locator("footer")).toHaveCSS("opacity", "0");
  // Keyboard focus brings the controls back.
  await pause.focus();
  await expect(page.locator("footer")).toHaveCSS("opacity", "1");
  await pause.click();
  await expect(
    page.getByRole("button", { name: "Resume timer" }),
  ).toBeVisible();
  await expect(page.locator("footer")).toHaveAttribute("data-hidden", "false");
});

test("the writer chooses a typeface and the choice is kept", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/doc");
  const writing = pageText(page);
  const before = await writing.evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );

  await showFormatting(page);
  await page.getByRole("button", { name: /^Typeface: Newsreader/ }).click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitemradio", { name: /Newsreader/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("group", { name: "Typewriter" })).toBeVisible();
  await expectSettledOverlay(menu);
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="dropdown-menu-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await menu.getByRole("menuitemradio", { name: /Courier Prime/ }).click();

  await expect(
    page.getByRole("button", { name: /^Typeface: Courier Prime/ }),
  ).toBeVisible();
  const after = await writing.evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );
  expect(after).not.toBe(before);
  expect(after).toMatch(/monospace/);

  await page.reload();
  await showFormatting(page);
  await expect(
    page.getByRole("button", { name: /^Typeface: Courier Prime/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      writing.evaluate((element) => getComputedStyle(element).fontFamily),
    )
    .toBe(after);
});

test("pages keep their own format and every space and tab", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/doc");
  await page.getByRole("textbox", { name: "Title" }).fill("Harmattan");
  const first = pageText(page);
  await first.click();
  await first.pressSequentially("the light went");
  await page.keyboard.press("Tab");
  await page.keyboard.type("thin     and gold");

  // A second page, with its own format.
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitem", { name: "Section break, own format" })
    .click();
  const second = pageText(page, 1);
  await expect(second).toBeFocused();
  await second.pressSequentially("waiting");
  await showFormatting(page);
  await page.getByRole("button", { name: "Page format" }).click();
  const format = page.getByRole("dialog", { name: "Format" });
  await expect(format).toContainText("Page 2 of 2");
  await format.getByLabel("Line spacing").selectOption("3");
  await format.getByLabel("Letter spacing").selectOption("0.5");
  await format.getByRole("radio", { name: "Center" }).click();
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="sheet-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");

  const style = (index: number) =>
    pageText(page, index).evaluate((element) => {
      const computed = getComputedStyle(element.parentElement!.parentElement!);
      return [computed.textAlign, computed.letterSpacing];
    });
  expect(await style(1)).not.toEqual(await style(0));
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // Reloaded, the pages, their format and the exact spacing come back.
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Harmattan",
  );
  await expect(pageText(page)).toHaveText("the light went\tthin     and gold");
  await expect(pageText(page, 1)).toHaveText("waiting");
  expect((await style(1))[0]).toBe("center");

  // In page view each page is a sheet of the chosen paper.
  const sheet = page.locator('[data-slot="writing-page"]').first();
  const width = await sheet.evaluate(
    (element) => getComputedStyle(element).width,
  );
  expect(parseFloat(width)).toBeCloseTo(210 * (96 / 25.4), 0);
});

test("projects gather pieces in an order, outline them and compile them", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/doc");
  const writing = pageText(page);
  await expect(writing).toBeFocused();

  // A project starts from a template.
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page.getByRole("button", { name: "New project" }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByLabel("Title").fill("Harmattan");
  await create.getByRole("radio", { name: /Short story/ }).click();
  await expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await create.getByRole("button", { name: "Create project" }).click();
  const binder = page.getByRole("list", { name: "Pieces in Harmattan" });
  await expect(binder.getByRole("link")).toHaveText([/^Draft/, /^Notes/]);
  await expect(page.getByLabel("Project title")).toHaveValue("Harmattan");
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="sheet-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);

  // A piece opens from the binder and saves like any entry.
  await binder.getByRole("link", { name: /^Draft/ }).click();
  await expect(writing).toBeFocused();
  await writing.pressSequentially("Dust on the louvres.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // The header names the project; the binder reorders by its menu.
  await page.getByRole("button", { name: /Project: Harmattan/ }).click();
  await page.getByRole("button", { name: "Options for Notes" }).click();
  const ordered = page.waitForResponse(
    (response) =>
      response.url().includes("/pieces") &&
      response.request().method() === "PUT",
  );
  await page.getByRole("menuitem", { name: "Move up" }).click();
  expect((await ordered).status()).toBe(200);
  await expect(binder.getByRole("link")).toHaveText([/^Notes/, /^Draft/]);

  // The order and the card are kept in the account.
  await page.getByRole("button", { name: "Outline" }).click();
  const outline = page.getByRole("dialog", { name: /Outline/ });
  await outline.getByLabel("Status").nth(1).selectOption("revised");
  await outline.getByLabel("Synopsis").nth(1).fill("Morning, before the dust.");
  await outline.getByLabel("Synopsis").nth(0).click();
  await expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("button", { name: /Project: Harmattan/ }).click();
  await expect(binder.getByRole("link")).toHaveText([
    /^Notes/,
    /^Draft.*Revised/,
  ]);
  await page.getByRole("button", { name: "Outline" }).click();
  await expect(outline.getByLabel("Synopsis").nth(1)).toHaveValue(
    "Morning, before the dust.",
  );
  await page.keyboard.press("Escape");

  // Compile gathers every piece in order as one printable manuscript.
  await page.getByRole("button", { name: "Compile" }).click();
  const compileDialog = page.getByRole("dialog", { name: /Compile/ });
  await compileDialog.getByRole("button", { name: "Compile" }).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 2, name: "Harmattan" }),
  ).toBeVisible();
  const compiledPages = page.locator('[data-slot="writing-page-text"]');
  await expect(compiledPages.first()).toHaveText("Harmattan");
  await expect(compiledPages.nth(1)).toHaveText("Notes");
  await expect(compiledPages.nth(2)).toHaveText("DraftDust on the louvres.");
  await page.getByRole("button", { name: "Back to writing" }).click();
  await expect(writing).toHaveText("Dust on the louvres.");

  // A loose piece moves into the project.
  await page.getByRole("button", { name: "New entry" }).click();
  await writing.pressSequentially("Loose words.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page.getByRole("button", { name: "Options for Loose words." }).click();
  await page.getByRole("menuitemradio", { name: "Harmattan" }).click();
  const library = page.locator('[data-slot="sheet-content"]');
  await expect(library.getByRole("link", { name: /Loose words/ })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /Project: Harmattan/ }),
  ).toBeVisible();

  // Deleting the project keeps every piece.
  await page.getByRole("button", { name: /Project: Harmattan/ }).click();
  await page.getByRole("button", { name: "Project options" }).click();
  await page.getByRole("menuitem", { name: "Delete project…" }).click();
  await page.getByRole("button", { name: "Delete project" }).click();
  await expect(
    page.getByRole("heading", { name: "Loose pieces" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="sheet-content"]').getByRole("link"),
  ).toHaveCount(3);
});

test("text flows onto the next page and back as it is written", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const first = pageText(page, 0);
  await expect(first).toBeFocused();
  // Printed pages are the default at this width. An A4 page at 12 pt and 1.5 spacing holds about 38 lines.
  for (let line = 1; line <= 45; line += 1) {
    await page.keyboard.type(`Line ${line}`);
    if (line < 45) await page.keyboard.press("Enter");
  }
  const second = pageText(page, 1);
  await expect(second).toBeVisible();
  await expect(second).toContainText("Line 45");
  // The caret follows the text onto the new page.
  await expect(second).toBeFocused();
  await expect(first).toContainText("Line 1");
  await expect(first).not.toContainText("Line 45");
  await page.keyboard.type(" and on");
  await expect(second).toContainText("Line 45 and on");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // Deleting lines on the first page brings text back, and the empty page goes.
  await first.getByText("Line 1", { exact: true }).click();
  await page.keyboard.press("Home");
  await first
    .getByText("Line 12", { exact: true })
    .click({ modifiers: ["Shift"] });
  await page.keyboard.press("Shift+End");
  // The editor reads a mouse-made selection on the browser's next selection event.
  await page.waitForTimeout(150);
  await page.keyboard.press("Backspace");
  await expect(pageText(page, 1)).toHaveCount(0);
  await expect(first).toContainText("Line 45 and on");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
});

test("a page becomes a free canvas with boxes placed by hand and kept", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const first = pageText(page, 0);
  await expect(first).toBeFocused();
  await first.pressSequentially("wind");

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "Free canvas" }).click();
  const box = page.locator('[data-slot="writing-box"]');
  await expect(box).toHaveCount(1);
  await expect(box.first()).toContainText("wind");

  // The handle moves the box by keyboard, 10 mm a press with Shift.
  const handle = page.getByRole("button", { name: /^Move text box 1/ });
  await handle.focus();
  const before = await box.first().evaluate((element) => element.style.left);
  for (let step = 0; step < 4; step += 1)
    await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("]");
  const left = await box.first().evaluate((element) => element.style.left);
  expect(parseFloat(left) - parseFloat(before)).toBeCloseTo(40, 5);
  await expect(box.first()).toHaveAttribute("style", /rotate\(15deg\)/);

  // A second box goes where the writer puts it.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Add a text box" }).click();
  await expect(box).toHaveCount(2);
  await page.keyboard.type("sand");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="writing-page"]')
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.reload();
  await expect(box).toHaveCount(2);
  await expect(box.filter({ hasText: "wind" })).toHaveAttribute(
    "style",
    new RegExp(`left: ${parseFloat(left)}mm.*rotate\\(15deg\\)`),
  );
  await expect(box.filter({ hasText: "sand" })).toBeVisible();

  // Back to flowing text, every word kept in reading order.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "Flowing text" }).click();
  await expect(box).toHaveCount(0);
  await expect(pageText(page, 0)).toHaveText(/sand.*wind|wind.*sand/);
});

test("snapshots keep a version to compare and restore; find replaces across pages; the room can be dark", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const first = pageText(page, 0);
  await expect(first).toBeFocused();
  await first.pressSequentially("The rain came early.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  const originalId = new URL(page.url()).searchParams.get("entry");
  // A named version, then a change.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Revision history…" }).click();
  const sheet = page.getByRole("dialog", { name: "Revision history", includeHidden: true });
  await sheet.getByLabel("Name, if you like").fill("First rain");
  await sheet.getByRole("button", { name: "Name current version" }).click();
  await expect(sheet.getByText("First rain")).toBeVisible();
  await expectSettledOverlay(sheet);
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="sheet-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await first.click();
  await moveDocumentCursor(page, "end");
  await page.keyboard.press("Enter");
  await page.keyboard.type("It stayed. The rain is still here.");
  await expect(first).toHaveText("The rain came early.It stayed. The rain is still here.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // Compare marks the new line.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Revision history…" }).click();
  await sheet.getByRole("button", { name: "Compare" }).first().click();
  const compare = page.getByRole("dialog", { name: "First rain and now", includeHidden: true });
  await expect(
    compare.getByText("It stayed. The rain is still here."),
  ).toBeVisible();
  await expect(compare.getByText("New since:", { exact: false })).toHaveCount(
    1,
  );
  await page.keyboard.press("Escape");

  await expect(compare).toHaveCount(0);
  await expect.poll(() => sheet.evaluate((element) => element.contains(window.document.activeElement))).toBe(true);
  // Find and replace reaches every match.
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await first.click();
  await page.keyboard.press(`${modifier}+f`);
  const find = page.getByRole("search", { name: "Find and replace" });
  await find.getByLabel("Find", { exact: true }).fill("rain");
  await expect(find.getByRole("status")).toHaveText("1 of 2");
  await find.getByLabel("Replace with").fill("harmattan");
  await find.getByRole("button", { name: "Replace all" }).click();
  await expect(first).toHaveText(
    "The harmattan came early.It stayed. The harmattan is still here.",
  );
  await expect(find.getByRole("status")).toHaveText("No matches");
  await page.keyboard.press("Escape");
  await expect(find).toBeHidden();
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // Restoring opens a new piece and preserves the current original.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Revision history…" }).click();
  await sheet.getByRole("button", { name: "Options for First rain" }).click();
  await page.getByRole("menuitem", { name: "Restore as a copy…" }).click();
  await page.getByRole("button", { name: "Open restored copy", exact: true }).click();
  await expect(pageText(page, 0)).toHaveText("The rain came early.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("entry")).not.toBe(originalId);
  const original = await page.request.get(`/api/me/writing/${originalId}`);
  expect((await original.json()).entry.body).toContain("harmattan");

  // Dark appearance is kept.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(page.locator('[role="menu"][data-ending-style]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.document.getAnimations().filter(animation =>
    (animation.playState === "running" || animation.pending) &&
    animation.effect?.getComputedTiming().iterations !== Infinity
  ).length)).toBe(0);
  await expect(
    (await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze()).violations,
  ).toEqual([]);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("a piece is written for a call: its limit counted and its blind reading checked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const email = await signIn(page);

  // A call in the tracker, read blind, with an eight-word limit. The database
  // is touched only for the listing and its tracker row, which a test listing
  // can't reach through the public tracker API.
  const run = `${Date.now().toString(36)}${Math.random().toString(16).slice(2, 6)}`;
  const opportunityId = `night-river-${run}`;
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query(
      `insert into radar_organizations(id,data) values ($1, jsonb_build_object('id',$1::text,'name','The Night River Review'))`,
      [`org-${run}`],
    );
    await client.query(
      `insert into opportunity_sources(id,organization_id,name,url,kind) values ($1,$2,'E2E source','https://example.com/calls','website')`,
      [`src-${run}`, `org-${run}`],
    );
    // The publication gate checks source evidence this fixture doesn't need.
    await client.query("set session_replication_role = replica");
    await client.query(
      `insert into opportunities(id,slug,title,organization_id,source_id,status,publication_state,type,deadline_date) values
       ($1,$1,'Night River Prize',$2,$3,'open','published','open-call',current_date + 40)`,
      [opportunityId, `org-${run}`, `src-${run}`],
    );
    await client.query("set session_replication_role = origin");
    await client.query(
      `insert into opportunity_call_profiles(opportunity_id,word_limit_max,confidence,eligibility_summary,source_url) values ($1,8,'confirmed','Poems are read blind.','https://example.com/calls')`,
      [opportunityId],
    );
    await client.query(
      `insert into tracked_opportunities(id,account_id,opportunity_id,status,revision)
       select $1, id, $2, 'interested', 1 from radar_accounts where lower(email)=lower($3)`,
      [`tracked-${run}`, opportunityId, email],
    );
  } finally {
    await client.end();
  }

  await page.goto("/doc");
  const writing = pageText(page);
  await expect(writing).toBeFocused();
  await writing.pressSequentially("Adaeze Writer walks out into the rain.");
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Write for a call…" }).click();
  const sheet = page.getByRole("dialog", { name: "For a call" });
  await sheet
    .getByRole("button", { name: "Write for Night River Prize" })
    .click();
  await expect(
    sheet.getByRole("heading", { name: "Night River Prize" }),
  ).toBeVisible();
  const words = sheet.getByRole("listitem").filter({ hasText: "Word limit" });
  await expect(words).toContainText("Passed");
  await expect(words).toContainText("This piece has 7 words.");
  const blind = sheet
    .getByRole("listitem")
    .filter({ hasText: "Anonymous review" });
  await expect(blind).toContainText("Needs attention");
  await expect(blind).toContainText("your name is in the text");
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="sheet-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");

  // The footer counts against the limit as the piece grows past it.
  await expect(page.getByText("7 / 8 words")).toBeVisible();
  await writing.click();
  await moveDocumentCursor(page, "start");
  await page.keyboard.press("Shift+End");
  await page.keyboard.type("She walks out into the rain and on into the dark.");
  await expect(page.getByText("11 / 8 words")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // The link is kept with the piece; the name is gone, so the check passes.
  await page.reload();
  await expect(page.getByText("11 / 8 words")).toBeVisible();
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "For a call…" }).click();
  await expect(words).toContainText("Needs attention");
  await expect(words).toContainText("11 words, 3 over");
  await expect(blind).toContainText("Passed");

  // Untying the piece brings back the plain count.
  await sheet.getByRole("button", { name: "Write without a call" }).click();
  await expect(
    sheet.getByRole("button", { name: "Write for Night River Prize" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("11 words", { exact: true })).toBeVisible();
});

test("Ctrl+Enter breaks the page as in Google Docs; Backspace joins it again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const first = pageText(page, 0);
  await expect(first).toBeFocused();
  await first.pressSequentially("Before the break");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after it");
  // The caret at the start of the second line: the break goes there. The
  // editor reads a caret the browser moved on its next selection event.
  await page.keyboard.press("Home");
  await page.waitForTimeout(150);
  await page.keyboard.press(`${modifier}+Enter`);
  const second = pageText(page, 1);
  await expect(second).toBeFocused();
  await expect(first).toHaveText("Before the break");
  await expect(second).toHaveText("after it");
  const breaks = page.locator('[data-slot="writing-break"]');
  await expect(breaks).toHaveText(["Page break"]);
  await expect(page.getByRole("button", { name: "Save status: Saved to account", exact: true })).toBeVisible();

  // A page break keeps the section's format: a change reaches both pages.
  await showFormatting(page);
  await page.getByRole("button", { name: "Page format" }).click();
  const format = page.getByRole("dialog", { name: "Format" });
  await expect(format).toContainText("This section, 2 pages");
  await format.getByRole("radio", { name: "Center" }).click();
  await page.keyboard.press("Escape");
  const align = (index: number) =>
    pageText(page, index).evaluate(
      (element) =>
        getComputedStyle(element.parentElement!.parentElement!).textAlign,
    );
  expect(await align(0)).toBe("center");
  expect(await align(1)).toBe("center");

  // Kept across a reload.
  await page.reload();
  await expect(pageText(page, 1)).toHaveText("after it");
  await expect(breaks).toHaveText(["Page break"]);

  // A section break starts a format of its own.
  await pageText(page, 1).click();
  await page.waitForTimeout(150);
  await moveDocumentCursor(page, "end");
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitem", { name: "Section break, own format" })
    .click();
  await expect(pageText(page, 2)).toBeFocused();
  await expect(breaks).toHaveText(["Page break", "Section break"]);
  await page.keyboard.type("a new part");
  await showFormatting(page);
  await page.getByRole("button", { name: "Page format" }).click();
  await expect(format).toContainText("This page");
  await format.getByRole("radio", { name: "Right" }).click();
  await page.keyboard.press("Escape");
  expect(await align(2)).toBe("right");
  expect(await align(1)).toBe("center");

  // Backspace at the start of a section with its own format asks for the menu.
  await pageText(page, 2).click();
  // ProseMirror reads a mouse selection a moment after the click.
  await page.waitForTimeout(150);
  await moveDocumentCursor(page, "start");
  await page.waitForTimeout(150);
  await page.keyboard.press("Backspace");
  await expect(page.getByText("This page has its own format.")).toBeVisible();
  await expect(breaks).toHaveCount(2);

  // Backspace at the start of the page after a page break joins it again.
  await pageText(page, 1).click();
  // ProseMirror reads a mouse selection a moment after the click.
  await page.waitForTimeout(150);
  await moveDocumentCursor(page, "start");
  await page.waitForTimeout(150);
  await page.keyboard.press("Backspace");
  await expect(breaks).toHaveText(["Section break"]);
  await expect(pageText(page, 0)).toHaveText("Before the breakafter it");
  await expect(pageText(page, 1)).toHaveText("a new part");

  // The menu removes a section break, taking the section's format.
  await pageText(page, 1).click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitem", {
      name: "Remove the section break before this page",
    })
    .click();
  await expect(breaks).toHaveCount(0);
  await expect(pageText(page, 0)).toHaveText(
    "Before the breakafter ita new part",
  );
  expect(await align(0)).toBe("center");
});

test("the shortcuts writers know from Google Docs, smart punctuation and the word count", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const text = pageText(page, 0);
  await expect(text).toBeFocused();

  // Superscript and subscript, and clearing them.
  await page.keyboard.type("E = mc");
  await page.keyboard.press(`${modifier}+.`);
  await page.keyboard.type("2");
  await page.keyboard.press(`${modifier}+.`);
  await page.keyboard.type(" and H");
  await page.keyboard.press(`${modifier}+,`);
  await page.keyboard.type("2");
  await page.keyboard.press(`${modifier}+,`);
  await page.keyboard.type("O");
  await expect(text.locator("sup")).toHaveText("2");
  await expect(text.locator("sub")).toHaveText("2");
  await page.keyboard.press(`${modifier}+a`);
  await page.keyboard.press("Alt+Shift+5");
  await expect(text.locator("s")).toHaveCount(1);
  await page.keyboard.press(`${modifier}+\\`);
  await expect(text.locator("s, sup, sub")).toHaveCount(0);

  // A dash after a tab stays as typed; at the start of a line it starts a list.
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("- not a list");
  await expect(text.locator("ul")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await page.keyboard.type("- one");
  await expect(text.locator("ul")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("nested");
  await expect(text.locator("ul ul")).toHaveText("nested");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  // Straight quotes stay straight until smart punctuation is turned on.
  await page.keyboard.type('"rain"');
  await expect(text).toContainText('"rain"');
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Smart quotes and dashes" })
    .click();
  await page.keyboard.press("Escape");
  await text.click();
  await moveDocumentCursor(page, "end");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.keyboard.type('"it\'s late" -- she said...');
  await expect(text).toContainText("“it’s late” — she said…");

  // The word count opens from the footer or the keyboard, and counts a selection.
  await page.keyboard.press(`${modifier}+Shift+c`);
  const dialog = page.getByRole("dialog", { name: "Word count" });
  await expect(dialog).toContainText("Reading time");
  await expectSettledOverlay(dialog);
  await expect(
    (
      await new AxeBuilder({ page })
        .include('[data-slot="dialog-content"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  // The last line: “it’s late” — she said…, four words.
  await text.click();
  await page.waitForTimeout(150);
  await moveDocumentCursor(page, "end");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+ArrowLeft" : "Shift+Home");
  await page.waitForTimeout(150);
  await expect(
    page.getByRole("button", { name: /^4 of \d+ words selected/u }),
  ).toBeVisible();
  await page.getByRole("button", { name: /selected\. Word count$/u }).click();
  await expect(dialog).toContainText(
    "The selected text, then the whole piece.",
  );
  await expect(dialog).toContainText(/4 of \d+/u);
});

test("quiet writing: quiet mode, focus on a paragraph or sentence, typewriter scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await page.goto("/doc");
  const text = pageText(page, 0);
  await expect(text).toBeFocused();
  await page.keyboard.type("The rain came early. It stayed.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Nobody minded.");

  // Quiet mode fades the controls without the timer, and comes back.
  const header = page.locator("header[data-hidden]");
  await expect(header).toHaveAttribute("data-hidden", "false");
  await page.keyboard.press(`${modifier}+Shift+f`);
  await expect(header).toHaveAttribute("data-hidden", "true");
  await page.keyboard.press(`${modifier}+Shift+f`);
  await expect(header).toHaveAttribute("data-hidden", "false");

  // Focus on this paragraph dims the others.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "This paragraph" }).click();
  await text.locator("p").first().click();
  await page.waitForTimeout(150);
  await expect(text.locator("p").nth(1)).toHaveClass(/text-muted-foreground/u);
  await expect(text.locator("p").first()).not.toHaveClass(
    /text-muted-foreground/u,
  );

  // Focus on this sentence dims the rest of the paragraph too.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "This sentence" }).click();
  await text.locator("p").first().click();
  await page.keyboard.press("End");
  await page.waitForTimeout(150);
  await expect(
    text.locator("p").first().locator("span.text-muted-foreground"),
  ).toHaveText("The rain came early. ");

  // Dialogue keeps only what is inside quotation marks clear.
  await page.keyboard.press("End");
  await page.keyboard.type(' "Let it," she said.');
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "Dialogue" }).click();
  const first = text.locator("p").first();
  await expect(first.locator("span.text-muted-foreground")).toHaveText([
    "The rain came early. It stayed. ",
    " she said.",
  ]);

  // Every line clear again.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitemradio", { name: "Every line clear" }).click();
  await expect(text.locator(".text-muted-foreground")).toHaveCount(0);

  // Typewriter scrolling keeps the line being written near the middle.
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Typewriter scrolling" })
    .click();
  await page.keyboard.press("Escape");
  await text.click();
  await moveDocumentCursor(page, "end");
  await page.waitForTimeout(150);
  for (let line = 0; line < 30; line += 1) {
    await page.keyboard.press("Enter");
    await page.keyboard.type(`line ${line}`);
  }
  const offset = await page.evaluate(() => {
    const range = window.getSelection()!.getRangeAt(0);
    const caret = range.getBoundingClientRect();
    const box = document
      .querySelector("main [aria-busy], main .overflow-y-auto")!
      .getBoundingClientRect();
    return caret.top + caret.height / 2 - (box.top + box.height / 2);
  });
  expect(Math.abs(offset)).toBeLessThan(40);

  // The word count can stay out of sight.
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Hide the word count" })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Word count", exact: true }),
  ).toHaveText("Word count");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Word count", exact: true }),
  ).toBeVisible();
});

test("the planner: cards, plotlines, a corkboard and an outline with totals, with Plus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const email = await signIn(page);
  await page.goto("/doc");
  await expect(pageText(page)).toBeFocused();

  // A project from the short story template: Draft and Notes.
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page.getByRole("button", { name: "New project" }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByLabel("Title").fill("Harmattan");
  await create.getByRole("radio", { name: /Short story/ }).click();
  await create.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("list", { name: "Pieces in Harmattan" }).getByRole("link"),
  ).toHaveText([/^Draft/, /^Notes/]);

  // On Free, the outline says what Plus adds, and cards can't be saved.
  await page.getByRole("button", { name: "Outline" }).click();
  const outline = page.getByRole("dialog", { name: /Outline/ });
  await expect(outline).toContainText("Included with Plus.");
  await page.keyboard.press("Escape");
  const listed = (await (await page.request.get("/api/me/writing")).json()) as {
    entries: { id: string; title: string }[];
  };
  const draft = listed.entries.find((entry) => entry.title === "Draft")!;
  const refused = await page.request.patch(`/api/me/writing/${draft.id}`, {
    data: { card: { pov: "Kemi" } },
  });
  expect(refused.status()).toBe(403);

  // With Plus, the planner opens instead.
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query(
      `insert into creator_plans(account_id,plan) select id,'plus' from radar_accounts where lower(email)=lower($1)`,
      [email],
    );
  } finally {
    await client.end();
  }
  await page.reload();
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page
    .getByRole("button", { name: /Harmattan/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Outline" }).click();
  const planner = page.getByRole("dialog", { name: "Plan: Harmattan" });
  await expect(planner).toContainText("2 pieces");

  // Plotlines for the project.
  await planner.getByRole("button", { name: "Plotlines" }).click();
  const plotlines = page.getByRole("dialog", { name: "Plotlines" });
  await plotlines.getByLabel("New plotline").fill("The search");
  await plotlines.getByRole("button", { name: "Add" }).click();
  await plotlines.getByLabel("New plotline").fill("The house");
  await plotlines.getByRole("button", { name: "Add" }).click();
  await expectSettledOverlay(plotlines);
  await expect(page.locator('[role="dialog"][data-ending-style]')).toHaveCount(0);
  await expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await plotlines.getByRole("button", { name: "Save plotlines" }).click();
  await expect(
    planner.getByRole("button", { name: "Plotlines (2)" }),
  ).toBeVisible();

  // A card for the draft.
  await planner
    .getByRole("button", { name: "Edit the card for Draft" })
    .click();
  const card = page.getByRole("dialog", { name: "Card: Draft" });
  await card.getByLabel("Synopsis").fill("She finds the letter.");
  await card.getByLabel("Point of view").fill("Kemi");
  await card.getByLabel("Characters").fill("Kemi, Tunde");
  await card.getByLabel("When").fill("Day 3, evening");
  await card.getByRole("checkbox", { name: "The search" }).click();
  await card.getByLabel("Word target").fill("2000");
  await card.getByLabel("Goal").fill("Find her sister");
  await expectSettledOverlay(card);
  await expect(page.locator('[role="dialog"][data-ending-style]')).toHaveCount(0);
  await expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await card.getByRole("button", { name: "Save card" }).click();
  await expect(planner).toContainText("She finds the letter.");
  await expect(planner).toContainText("Kemi · Day 3, evening");
  await expect(planner).toContainText("0 of 2,000 words");

  // Arranged by plotline, the draft sits under its plotline.
  await planner.getByLabel("Arrange by").selectOption("plotline");
  await expect(
    planner.getByRole("region", { name: "The search" }),
  ).toContainText("Draft");
  await expect(
    planner.getByRole("region", { name: "No plotline" }),
  ).toContainText("Notes");

  // The outline adds up words against targets.
  await planner.getByRole("tab", { name: "Outline" }).click();
  await expect(planner.getByRole("table")).toContainText("All pieces");
  await expect(planner.getByRole("table")).toContainText("0 of 2,000 words");
  await expectSettledOverlay(planner);
  await expect(page.locator('[role="dialog"][data-ending-style]')).toHaveCount(0);
  await expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);

  // Kept in the account.
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByRole("menuitem", { name: "Open library", exact: true }).click();
  await page
    .getByRole("button", { name: /Harmattan/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Outline" }).click();
  await expect(planner).toContainText("She finds the letter.");
  await expect(
    planner.getByRole("button", { name: "Plotlines (2)" }),
  ).toBeVisible();
});
