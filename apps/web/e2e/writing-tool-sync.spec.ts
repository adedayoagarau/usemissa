import { expect, test, type Page } from "@playwright/test";
import { newWritingEntryId } from "../lib/writing";
import {
  plainTextToDocument,
  serializeDocument,
} from "../lib/writing-document";
const modifier = process.platform === "darwin" ? "Meta" : "Control";
async function setup(page: Page) {
  const response = await page.request.post("/api/auth/signup", {
    data: {
      email: `tools-${Date.now()}-${Math.random()}@example.com`,
      password: "correct-horse-battery",
      givenName: "Ada",
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
  const document = plainTextToDocument(
    "Keep this original passage.",
    "newsreader",
  );
  expect(
    (
      await page.request.put(`/api/me/writing/${id}`, {
        data: {
          title: "Sync piece",
          body: "Keep this original passage.",
          document: serializeDocument(document),
          baseRevision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/doc?entry=${id}`);
  await expect(
    page.locator('[data-slot="writing-page-text"]').first(),
  ).toContainText("Keep this original passage.");
  return id;
}
async function openChecks(page: Page) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  const item = page.getByRole("menuitem", {
    name: "Writing checks…",
    exact: true,
  });
  await item.focus();
  await page.keyboard.press("Enter");
  return page.getByRole("dialog", { name: "Writing checks", exact: true });
}
async function openRevisions(page: Page) {
  await page.getByRole("button", { name: "More", exact: true }).click();
  const item = page.getByRole("menuitem", {
    name: "Revision notes and cuttings",
    exact: true,
  });
  await item.focus();
  await page.keyboard.press("Enter");
  return page.getByRole("dialog", { name: "Revise", exact: true });
}
test("preferences dictionary and private notes persist across independent browser contexts, including immediate close", async ({
  page,
  browser,
}) => {
  const id = await setup(page);
  const origin = new URL(page.url()).origin;
  expect(
    (
      await page.request.put("/api/me/writing/tools/dictionary/account", {
        headers: { Origin: origin },
        data: { baseRevision: 0, data: { words: ["Missa"] } },
      })
    ).status(),
  ).toBe(200);
  const checks = await openChecks(page);
  await expect(
    checks.getByText("Account copy opened.", { exact: true }),
  ).toHaveCount(2);
  await checks.getByLabel("English variety", { exact: true }).selectOption("1");
  await page.keyboard.press("Escape");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/me/writing/tools/checks/${id}`)
          ).json()
        ).record.data.dialect,
    )
    .toBe(1);
  const second = await browser.newContext();
  await second.addCookies(await page.context().cookies());
  const next = await second.newPage();
  await next.goto(`/doc?entry=${id}`);
  const nextChecks = await openChecks(next);
  await expect(
    nextChecks.getByLabel("English variety", { exact: true }),
  ).toHaveValue("1");
  await expect(nextChecks.getByText(/1 dictionary words/)).toBeVisible();
  await next.keyboard.press("Escape");
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await editor.click();
  await editor.press(`${modifier}+a`);
  const revision = await openRevisions(page);
  await expect(
    revision.getByText("Account copy opened.", { exact: true }),
  ).toBeVisible();
  await revision
    .getByLabel("Your replacement or comment", { exact: true })
    .fill("Private cross-device revision");
  await revision
    .getByRole("button", { name: "Add comment", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect
    .poll(async () =>
      JSON.stringify(
        (
          await (
            await page.request.get(`/api/me/writing/tools/revisions/${id}`)
          ).json()
        ).record.data,
      ),
    )
    .toContain("Private cross-device revision");
  const nextRevision = await openRevisions(next);
  await expect(
    nextRevision.getByText("Private cross-device revision", { exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`/api/me/writing/${id}`)).json()).entry.body,
  ).toBe("Keep this original passage.");
  await second.close();
});
test("an older overlapping account load cannot replace a newly saved preference", async ({
  page,
}) => {
  const id = await setup(page);
  let requests = 0;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/me/writing/tools/checks/${id}`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    requests++;
    if (requests === 1) await held;
    await route.fulfill({
      json: {
        record: {
          revision: 0,
          data: { dialect: 0, disabledRules: [], ignoredHashes: [] },
        },
      },
    });
  });
  const dialog = await openChecks(page);
  await expect.poll(() => requests).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => requests).toBe(2);
  await expect(
    dialog.getByText("Account copy opened.", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("English variety", { exact: true }).selectOption("2");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/me/writing/tools/checks/${id}`)
          ).json()
        ).record.data.dialect,
    )
    .toBe(2);
  release();
  await expect(
    dialog.getByLabel("English variety", { exact: true }),
  ).toHaveValue("2");
  await page.keyboard.press("Escape");
});

test("offline edits retain both copies when another device changes preferences", async ({
  page,
  browser,
}) => {
  const id = await setup(page);
  let checks = await openChecks(page);
  await expect(
    checks.getByText("Account copy opened.", { exact: true }),
  ).toHaveCount(2);
  await checks.getByLabel("English variety", { exact: true }).selectOption("1");
  await page.keyboard.press("Escape");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/me/writing/tools/checks/${id}`)
          ).json()
        ).record.data.dialect,
    )
    .toBe(1);
  const other = await browser.newContext();
  await other.addCookies(await page.context().cookies());
  const second = await other.newPage();
  await second.goto(`/doc?entry=${id}`);
  const secondChecks = await openChecks(second);
  await expect(
    secondChecks.getByLabel("English variety", { exact: true }),
  ).toHaveValue("1");
  await other.setOffline(true);
  await secondChecks
    .getByLabel("English variety", { exact: true })
    .selectOption("3");
  await second.keyboard.press("Escape");
  checks = await openChecks(page);
  await expect(
    checks.getByText("Account copy opened.", { exact: true }),
  ).toHaveCount(2);
  await checks.getByLabel("English variety", { exact: true }).selectOption("4");
  await page.keyboard.press("Escape");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/me/writing/tools/checks/${id}`)
          ).json()
        ).record.data.dialect,
    )
    .toBe(4);
  await other.setOffline(false);
  const conflict = await openChecks(second);
  await expect(
    conflict.getByRole("button", { name: "Download both copies", exact: true }),
  ).toBeVisible();
  await expect(
    conflict.getByLabel("English variety", { exact: true }),
  ).toHaveValue("3");
  await conflict
    .getByRole("button", { name: "Use account copy", exact: true })
    .click();
  await expect(
    conflict.getByLabel("English variety", { exact: true }),
  ).toHaveValue("4");
  expect(
    await second.evaluate(() =>
      Object.entries(localStorage).some(
        ([key, value]) =>
          key.includes(":conflict:") &&
          JSON.parse(value).local.dialect === 3 &&
          JSON.parse(value).account.data.dialect === 4,
      ),
    ),
  ).toBe(true);
  await other.close();
});
