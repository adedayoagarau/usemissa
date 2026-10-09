import { expect, test } from "@playwright/test";
import type { Editor } from "@tiptap/core";
test("printing uses proposed reading and hides private revision panels without changing document", async ({
  page,
}) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `print-${Date.now()}@example.com`,
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
  await page.goto("/doc");
  const editor = page.locator('[data-slot="writing-page-text"]').first();
  await expect(editor).toBeVisible();
  const original = await editor.evaluate((element) => {
    const api = (element as HTMLElement & { editor: Editor }).editor;
    api.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Original deleted words",
              marks: [{ type: "writingDeletion", attrs: { id: "change" } }],
            },
            {
              type: "text",
              text: "Proposed inserted words",
              marks: [
                { type: "writingInsertion", attrs: { id: "change" } },
                { type: "underline" },
              ],
            },
          ],
        },
      ],
    });
    const plugin = api.state.plugins.find((plugin) => {
      const value = plugin.getState(api.state);
      return (
        value &&
        typeof value === "object" &&
        "view" in value &&
        "enabled" in value
      );
    })!;
    api.view.dispatch(api.state.tr.setMeta(plugin, { view: "original" }));
    return api.getJSON();
  });
  const inserted = editor.locator(
    'ins[data-writing-tracked="writingInsertion"]',
  );
  const deleted = editor.locator('del[data-writing-tracked="writingDeletion"]');
  await expect(inserted).not.toBeVisible();
  await expect(deleted).toBeVisible();
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Revision notes and cuttings", exact: true })
    .click();
  const panel = page.getByRole("dialog", {
    name: "Revise",
    exact: true,
  });
  await expect(panel).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(inserted).toBeVisible();
  await expect(deleted).not.toBeVisible();
  await expect(panel).not.toBeVisible();
  expect(
    await inserted.evaluate(
      (element) => getComputedStyle(element).textDecorationLine,
    ),
  ).toBe("none");
  await expect(editor.locator("u")).toBeVisible();
  expect(
    await editor
      .locator("u")
      .evaluate((element) => getComputedStyle(element).textDecorationLine),
  ).toContain("underline");
  const paper = page.locator('[data-slot="writing-page"]').first();
  const lightPaper = await paper.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color };
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(
    await paper.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    }),
  ).toEqual(lightPaper);
  expect(
    await paper.evaluate((element) => getComputedStyle(element).colorScheme),
  ).toBe("light");
  expect(
    await editor.evaluate((element) =>
      (element as HTMLElement & { editor: Editor }).editor.getJSON(),
    ),
  ).toEqual(original);
});
