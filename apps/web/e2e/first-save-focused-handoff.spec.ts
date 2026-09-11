import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const slug = "story-16-2-browser-fixture";
const title = "Story 16.2 Browser Fixture";
const password = "correct-horse-battery";

async function beginSignedOutSave(page: Page) {
  await page.goto(`/opportunities/${slug}`);
  const save = page.getByRole("button", { name: /Save .* privately/ });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/signup\?next=/);
  expect(new URL(page.url()).searchParams.has("intent")).toBeFalsy();
  await expect(page.getByText("Private Save")).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function createAccount(page: Page, email: string, includeName = true) {
  if (includeName) {
    await page.getByLabel("Name (optional)").fill("First Save Creator");
  }
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  const signupResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/signup") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Create account" }).click();
  const signup = await signupResponse;
  if (signup.status() === 201) {
    const sessionCookie = (await signup.allHeaders())["set-cookie"]?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
    expect(sessionCookie).toBeTruthy();
    await page.context().addCookies([{
      name: "missa_session",
      value: sessionCookie!,
      url: new URL(signup.url()).origin,
      httpOnly: true,
      sameSite: "Lax",
    }]);
  }
}

test("new creator gets private value before optional Tracker guidance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await beginSignedOutSave(page);
  await createAccount(page, `first-save-${Date.now()}@example.com`, false);

  await expect(
    page.getByRole("heading", { name: "Opportunity saved privately" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Opportunity saved privately" }),
  ).toBeFocused();
  await expect(page.getByText("Next useful action")).toBeVisible();
  await page.getByRole("button", { name: /Open Tracker/ }).click();
  await expect(page).toHaveURL(/\/tracker$/);
  await expect(
    page.getByRole("heading", { name: title, exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator("[data-first-save='true']")).toBeFocused();
  await expect(
    page.getByText(/Only you can see this Tracker item/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss guidance" }).click();
  await expect(
    page.getByRole("button", { name: `Show guidance for ${title}` }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Show guidance for ${title}` })
    .click();
  await expect(
    page.getByRole("button", { name: "Dismiss guidance" }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("existing email moves to login without losing the Opportunity or email", async ({
  page,
}) => {
  const email = `first-save-existing-${Date.now()}@example.com`;
  expect(
    (
      await page.request.post("/api/auth/signup", {
        data: { email, password, displayName: "Existing Creator" },
      })
    ).status(),
  ).toBe(201);
  await page.request.post("/api/auth/logout");

  await beginSignedOutSave(page);
  await createAccount(page, email);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "An account already uses this email" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log in with this email" }).click();
  await expect(page.getByLabel("Email address")).toHaveValue(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid email or password" }),
  ).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Opportunity saved privately" }),
  ).toBeVisible();
});

test("material changes require acknowledgement and a closed Opportunity blocks Save", async ({
  page,
}) => {
  await beginSignedOutSave(page);
  let reviewRequests = 0;
  await page.route("**/api/journey/first-save/resume", async (route) => {
    reviewRequests += 1;
    const requestBody = route.request().postDataJSON() as {
      acknowledgedFingerprint?: string;
    };
    if (!requestBody.acknowledgedFingerprint) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          status: "review-required",
          journeyId: "journey-review",
          opportunityId: "opp-review",
          title,
          currentFingerprint: "current-fingerprint",
          changes: [
            {
              code: "deadline",
              label: "Deadline",
              before: "2026-08-20 at 17:00 UTC",
              after: "2026-09-03 at 17:00 UTC",
            },
          ],
          currentPath: `/opportunities/${slug}`,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: "created",
        receipt: {
          journeyId: "journey-review",
          opportunityId: "opp-review",
          title,
          result: "created",
          privateState: true,
          nextAction: {
            kind: "review-requirements",
            label: "Review requirements",
            description: "Start with the current requirements.",
            href: `/opportunities/${slug}`,
          },
        },
      }),
    });
  });
  await createAccount(page, `first-save-change-${Date.now()}@example.com`);
  await expect(
    page.getByRole("heading", { name: "This Opportunity changed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "This Opportunity changed" }),
  ).toBeFocused();
  await expect(page.getByText(/Was: 2026-08-20/)).toBeVisible();
  await expect(page.getByText(/Now: 2026-09-03/)).toBeVisible();
  await page.getByRole("button", { name: "Save current details" }).click();
  await expect(
    page.getByRole("heading", { name: "Opportunity saved privately" }),
  ).toBeVisible();
  expect(reviewRequests).toBe(2);

  await page.request.post("/api/auth/logout");
  await page.unroute("**/api/journey/first-save/resume");
  await beginSignedOutSave(page);
  await page.route("**/api/journey/first-save/resume", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        status: "blocked",
        opportunityId: "opp-closed",
        title,
        reason: "closed",
        currentPath: `/opportunities/${slug}`,
      }),
    });
  });
  await createAccount(page, `first-save-closed-${Date.now()}@example.com`);
  await expect(
    page.getByRole("heading", { name: "This Opportunity is closed" }),
  ).toBeVisible();
  await expect(page.getByText(/did not add it to your Tracker/)).toBeVisible();
});

test("an interrupted response retries safely and a repeated Save returns one item", async ({
  page,
}) => {
  await beginSignedOutSave(page);
  let writeAttempts = 0;
  await page.route("**/api/journey/first-save/resume", async (route) => {
    const canonicalResponse = await route.fetch();
    if (canonicalResponse.status() === 202) {
      await route.fulfill({ response: canonicalResponse });
      return;
    }
    writeAttempts += 1;
    if (writeAttempts === 1) {
      expect(canonicalResponse.status()).toBe(201);
      await route.abort("timedout");
      return;
    }
    await route.fulfill({ response: canonicalResponse });
  });
  await createAccount(page, `first-save-retry-${Date.now()}@example.com`);
  await expect(
    page.getByRole("heading", { name: "Saving was interrupted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Already in your Tracker" }),
  ).toBeVisible();
  await page.unroute("**/api/journey/first-save/resume");

  const opportunities = await page.request.get("/api/opportunities?limit=1");
  const payload = (await opportunities.json()) as {
    items: Array<{ id: string; title: string }>;
  };
  const opportunity = payload.items[0]!;
  const repeated = await page.request.post("/api/me/tracker", {
    data: { opportunityId: opportunity.id },
  });
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).status).toBe("already-present");
  await page.goto("/tracker");
  await expect(
    page.getByRole("article").filter({
      has: page.getByRole("heading", { name: opportunity.title, exact: true }),
    }),
  ).toHaveCount(1);
});

test("declining signup returns to public reading without saving", async ({
  page,
}) => {
  await beginSignedOutSave(page);
  await page.getByRole("button", { name: "Return without saving" }).click();
  await expect(page).toHaveURL(new RegExp(`/opportunities/${slug}$`));
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Save .* privately/ }),
  ).toBeVisible();
});

test("an expired or invalid intent has an explicit restart path", async ({
  page,
  baseURL,
}) => {
  await page.context().addCookies([
    {
      name: "missa_first_save",
      value: "invalid.intent",
      url: baseURL!,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto(
    `/signup?next=${encodeURIComponent(`/opportunities/${slug}`)}`,
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "Save request expired" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to the Opportunity" }).click();
  await expect(page).toHaveURL(new RegExp(`/opportunities/${slug}$`));
});
