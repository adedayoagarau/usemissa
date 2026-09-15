import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  process.env.MISSA_E2E_NEON_AUTH !== "1",
  "Runs only against the focused mocked Neon Auth server.",
);

test("password signup verifies the email before opening a Missa session", async ({
  page,
}) => {
  const email = "verified-signup+long-address@example.com";
  let codeRequests = 0;
  let sessionRequests = 0;

  await page.route("**/api/auth/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === "/api/auth/sign-up/email") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: null,
          user: {
            id: "neon-user-verification-test",
            email,
            emailVerified: false,
            name: "Alex Morgan",
          },
        }),
      });
      return;
    }

    if (pathname === "/api/auth/email-otp/send-verification-otp") {
      codeRequests += 1;
      if (codeRequests === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (pathname === "/api/auth/email-otp/verify-email") {
      const body = request.postDataJSON() as { otp?: string };
      if (body.otp !== "123456") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ code: "INVALID_OTP", message: "Invalid OTP" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: true,
          token: "verified-neon-session",
          user: {
            id: "neon-user-verification-test",
            email,
            emailVerified: true,
            name: "Alex Morgan",
          },
        }),
      });
      return;
    }

    if (pathname === "/api/auth/missa-session") {
      sessionRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          account: { id: "acct-verification-test", email },
          created: true,
        }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/signup?next=/opportunities");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery");
  await page.getByLabel("Confirm password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByRole("heading", { name: "Check your email." }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: false })).toBeVisible();
  await expect(page.getByLabel("Verification code")).toBeFocused();
  await expect(page.locator("#verification-error")).toHaveText(
    "Too many codes were requested. Wait a moment, then choose Resend code.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  expect(codeRequests).toBe(1);
  expect(sessionRequests).toBe(0);

  await page.getByRole("button", { name: "Resend code" }).click();
  await expect.poll(() => codeRequests).toBe(2);

  await page.getByLabel("Verification code").fill("000000");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.locator("#verification-error")).toHaveText(
    "That code is incorrect or expired. Check the email and try again.",
  );
  expect(sessionRequests).toBe(0);

  await page.getByRole("button", { name: "Resend code" }).click();
  await expect.poll(() => codeRequests).toBe(3);

  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
    .toBe("/opportunities");
  expect(sessionRequests).toBe(1);
});
