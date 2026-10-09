import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("compact writing controls and dark contrast", async ({
  page,
}, testInfo) => {
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `polish-${Date.now()}@example.com`,
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

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/doc");
  await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Polish verification");
  await page
    .getByRole("textbox", { name: "Page 1", exact: true })
    .fill("A draft to keep and return to.");
  await page.getByRole("button", { name: /Save status:/ }).click();
  await expect(
    page.getByRole("button", { name: "Download a copy", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Polish verification", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Polish verification");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("mobile.png") });
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tools", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Tools", exact: true }),
  ).toHaveCount(0);
  const results = await new AxeBuilder({ page }).analyze();
  await page.screenshot({ path: testInfo.outputPath("dark.png") });
  expect(results.violations).toEqual([]);
  // A 1440px window at 200% browser zoom has a 720 CSS-pixel layout viewport.
  await page.setViewportSize({ width: 720, height: 500 });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const bounds = await page.getByRole("menu").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(720);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Library", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
