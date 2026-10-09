import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Drive controls import as a new piece and retry a stable explicit copy", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `drive-${Date.now()}@example.com`,
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
  // Provider responses are deliberately mocked; this certifies UI wiring, not real Google consent.
  await page.route("**/api/me/writing/drive", (route) =>
    route.fulfill({ json: { configured: true, connected: true } }),
  );
  await page.route("**/api/me/writing/drive/token", (route) =>
    route.fulfill({
      json: {
        accessToken: "test-token",
        pickerKey: "test-key",
        appId: "test-app",
      },
    }),
  );
  await page.route("https://apis.google.com/js/api.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.gapi={load:(name,options)=>{window.google={picker:{DocsView:class{setMimeTypes(){return this}},PickerBuilder:class{setDeveloperKey(){return this}setAppId(){return this}setOAuthToken(){return this}setOrigin(){return this}addView(){return this}setCallback(callback){this.callback=callback;return this}build(){const callback=this.callback;return {setVisible(visible){if(visible)setTimeout(()=>callback({action:'picked',docs:[{id:'selected_file',name:'Drive draft.txt'}]}),0)},dispose(){}}}}}};options.callback()}};`,
    }),
  );
  await page.route("**/api/me/writing/drive/import", (route) =>
    route.fulfill({
      body: "Imported words from Drive.",
      contentType: "text/plain",
      headers: { "X-Missa-File-Name": encodeURIComponent("Drive draft.txt") },
    }),
  );
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/me/writing/drive/export", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill(
      payloads.length === 1
        ? {
            status: 502,
            json: { error: "The copy could not be confirmed. Retry." },
          }
        : {
            status: 201,
            json: {
              file: {
                url: "https://drive.google.com/file/d/test/view",
                name: "Draft.docx",
              },
            },
          },
    );
  });
  await page.goto("/doc");
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await editor.fill("Original Missa words.");
  if (
    !(await page
      .getByRole("button", { name: "Google Drive", exact: true })
      .isVisible())
  )
    await page.getByRole("button", { name: "Tools", exact: true }).click();
  await page.getByRole("button", { name: "Google Drive", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Google Drive", exact: true });
  await expect(
    panel.getByRole("button", { name: "Open from Drive" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(async () => {
      const box = await panel.boundingBox();
      return box ? box.x + box.width : Infinity;
    })
    .toBeLessThanOrEqual(390);
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(320);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Google Drive", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await panel
    .getByRole("button", { name: "Save to Drive", exact: true })
    .click();
  await panel.getByRole("button", { name: "Save a copy to Drive" }).click();
  await expect(
    panel.getByRole("button", { name: "Retry the same copy" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Retry the same copy" }).click();
  expect(payloads[0]).toEqual(payloads[1]);
  await expect(
    panel.getByRole("link", { name: "Open Draft.docx" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Open from Drive" }).click();
  await expect(editor).toContainText("Imported words from Drive.");
  await expect(editor).not.toContainText("Original Missa words.");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(
    page.getByRole("link").filter({ hasText: "Original Missa words." }).first(),
  ).toBeVisible();
});

for (const written of [false, true]) {
  test(`Drive connection preserves ${written ? "written" : "blank"} drafts and the chosen action`, async ({
    page,
  }) => {
    const signup = await page.request.post("/api/auth/signup", {
      data: {
        email: `drive-${Date.now()}@example.com`,
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

    let connected = false;
    await page.route("**/api/me/writing/drive", (route) =>
      route.fulfill({ json: { configured: true, connected } }),
    );
    let startUrl = "";
    await page.route("**/api/me/writing/drive/start?**", async (route) => {
      startUrl = route.request().url();
      await route.fulfill({
        contentType: "text/html",
        body: "Google connection test",
      });
    });
    await page.goto("/doc");
    const editor = page.locator('[data-slot="writing-page-text"]').first();
    if (written) await editor.fill("Keep this draft through connection.");
    else {
      await editor.fill("Earlier draft should stay in the library.");
      await page
        .getByRole("button", { name: "New entry", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Tools", exact: true }).click();
    await page
      .getByRole("button", { name: "Google Drive", exact: true })
      .click();
    await page
      .getByRole("button", { name: written ? "Save to Drive" : "Open from Drive", exact: true })
      .click();
    await expect(page.getByText("Google connection test")).toBeVisible();
    const params = new URL(startUrl).searchParams;
    expect(params.get("action")).toBe(written ? "save" : "open");
    expect(Boolean(params.get("entry"))).toBe(written);
    connected = true;
    const back = new URLSearchParams({
      drive: "connected",
      driveAction: written ? "save" : "open",
    });
    if (params.get("entry")) back.set("entry", params.get("entry")!);
    else back.set("driveNew", "1");
    await page.goto(`/doc?${back}`);
    if (written)
      await expect(editor).toContainText("Keep this draft through connection.");
    else await expect(editor).toBeEmpty();
    await expect(
      page.getByText("That entry isn’t in your account"),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Open from Drive", exact: true }),
    ).toBeVisible();
    const save = page.getByRole("button", { name: "Save a copy to Drive" });
    if (written) await expect(save).toBeVisible();
    else await expect(save).toBeHidden();
  });
}
