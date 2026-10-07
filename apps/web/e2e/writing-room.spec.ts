import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Relational only: entries are saved to the account in Postgres (migrations 0095, 0096).

const pageText = (page: Page, index = 0) =>
  page.locator('[data-slot="writing-page-text"]').nth(index);

async function signIn(page: Page) {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `write-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
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
}

test("signed-out visitors are sent to sign in and back", async ({ page }) => {
  await page.goto("/write");
  await expect(page).toHaveURL(/\/login\?next=%2Fwrite$/);
});

test("the writing room saves as you type, reopens entries and deletes them", async ({
  page,
}) => {
  await signIn(page);
  const response = await page.goto("/write");
  // No browser agent tools where a creator writes.
  expect(response?.headers()["permissions-policy"]).toContain("tools=()");

  const writing = pageText(page);
  await expect(writing).toBeFocused();
  await writing.pressSequentially("The river does not wait for anyone.");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByText("7 words")).toBeVisible();
  await expect(page).toHaveURL(/\/write\?entry=writing_/);

  // A reload reopens the saved entry from the account.
  await page.reload();
  await expect(writing).toHaveText("The river does not wait for anyone.");

  // Offline, text stays on the device and is saved once the connection returns.
  await page.context().setOffline(true);
  await writing.click();
  await page.keyboard.press("Control+End");
  await writing.pressSequentially(" Neither do I.");
  await expect(page.getByText("Offline · kept on this device")).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const entryId = new URL(page.url()).searchParams.get("entry")!;
  const stored = (await (
    await page.request.get(`/api/me/writing/${entryId}`)
  ).json()) as { entry: { body: string } };
  expect(stored.entry.body).toBe(
    "The river does not wait for anyone. Neither do I.",
  );

  // A new entry starts blank; the earlier one opens from Entries.
  await page.getByRole("button", { name: "New entry" }).click();
  await expect(writing).toHaveText("");
  await expect(writing).toBeFocused();
  await writing.pressSequentially("Second page.");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Entries" }).click();
  const sheet = page.getByRole("dialog", { name: "Your writing" });
  await expect(sheet.getByRole("link")).toHaveCount(2);
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
  await page.getByRole("button", { name: "Entries" }).click();
  await sheet.getByRole("link", { name: /The river does not wait/ }).click();
  await expect(writing).toHaveText(
    "The river does not wait for anyone. Neither do I.",
  );
  await expect(writing).toBeFocused();

  // The promise is one click away.
  await page.getByRole("button", { name: "Private" }).click();
  await expect(
    page.getByText(
      "Missa adds no AI here. Nothing suggests, rewrites or finishes your words.",
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
  await page.goto("/write");
  const writing = pageText(page);
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
  await page.goto("/write");
  const writing = pageText(page);
  const before = await writing.evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );

  await page.getByRole("button", { name: /^Typeface: Newsreader/ }).click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitemradio", { name: /Newsreader/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("group", { name: "Typewriter" })).toBeVisible();
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
  await page.goto("/write");
  await page.getByRole("textbox", { name: "Title" }).fill("Harmattan");
  const first = pageText(page);
  await first.click();
  await first.pressSequentially("the light went");
  await page.keyboard.press("Tab");
  await page.keyboard.type("thin     and gold");

  // A second page, with its own format.
  await page.getByRole("button", { name: "More" }).click();
  await page
    .getByRole("menuitem", { name: "Add a page after this one" })
    .click();
  const second = pageText(page, 1);
  await expect(second).toBeFocused();
  await second.pressSequentially("waiting");
  await page.getByRole("button", { name: "Page format" }).click();
  const format = page.getByRole("dialog", { name: "Format" });
  await expect(format).toContainText("Page 2 of 2");
  await format.getByLabel("Line spacing").selectOption("3");
  await format.getByLabel("Letter spacing").selectOption("0.5");
  await format.getByRole("radio", { name: "Centre" }).click();
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
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

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
