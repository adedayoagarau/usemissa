import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const response = {
  items: ["residency", "grant", "magazine"].map((type, index) => ({
    id: `homepage_test-${index}`,
    slug: `homepage-test-${index}`,
    title:
      index === 0
        ? "An interdisciplinary residency for an ambitious new body of work across writing, moving image and performance"
        : `A new ${type} opportunity`,
    organizationName: "A test arts organization",
    status: "open",
    type,
    discipline: "interdisciplinary",
    genres: [],
    deadline:
      index === 0 ? { kind: "exact", date: "2026-12-31" } : { kind: "rolling" },
    fee: { status: "unknown" },
    submissionAvailable: true,
    source: {
      kind: "organization-website",
      name: "Test source",
      url: "https://example.org",
    },
  })),
  total: 3,
  nextCursor: null,
  query: { limit: 12 },
};

test("homepage reuses catalogue cards with real backend records", async ({
  page,
  context,
}) => {
  const backend = page.waitForResponse((response) =>
    response.url().endsWith("/api/opportunities?openNow=true&limit=12"),
  );
  await page.goto("/#how-missa-works");
  const data = await (await backend).json();
  const section = page.locator("#how-missa-works");
  await expect(section.locator("article")).toHaveCount(3, { timeout: 20000 });
  for (const card of await section.locator("article").all()) {
    const title = await card.locator("h3").innerText();
    const item = data.items.find(
      (item: { title: string }) => item.title === title,
    );
    expect(item).toBeTruthy();
    await expect(
      card.getByRole("link", { name: "View opportunity", exact: true }),
    ).toHaveAttribute("href", `/opportunities/${item.id}`);
  }
  const homeClass = await section
    .locator("article")
    .first()
    .getAttribute("class");
  const catalogue = await context.newPage();
  await catalogue.goto("/opportunities");
  await expect(catalogue.locator("article").first()).toHaveAttribute(
    "class",
    homeClass!,
  );
  await catalogue.close();
  const workspace = page.locator("#homepage-workspace");
  await workspace
    .getByRole("tab", { name: "Applications", exact: true })
    .click();
  await expect(workspace.locator("tbody tr")).toHaveCount(3);
  for (const row of await workspace.locator("tbody tr").all()) {
    const href = await row.getByRole("link").getAttribute("href");
    const record = data.items.find(
      (item: { id: string }) => href === `/opportunities/${item.id}`,
    );
    expect(record).toBeTruthy();
    await expect(row.locator("time")).toHaveAttribute(
      "datetime",
      record.deadline.date,
    );
  }
  await expect(
    workspace.getByRole("link", { name: "Open your Tracker" }),
  ).toHaveAttribute("href", "/tracker");
  await workspace
    .getByRole("tab", { name: "Notifications", exact: true })
    .click();
  await expect(
    workspace.getByRole("link", { name: "Open your Inbox" }),
  ).toHaveAttribute("href", "/inbox");
  await workspace.getByRole("tab", { name: "Goals", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Set a goal", exact: true }),
  ).toHaveAttribute("href", "/goals");
  await expect(page.locator("#places-to-know h3")).toHaveCount(6, {
    timeout: 20000,
  });
  await page
    .locator("#how-missa-works")
    .screenshot({ path: "/tmp/missa-copy-cards-desktop.png" });
  await page
    .locator(".missa-homepage-continuation")
    .first()
    .screenshot({ path: "/tmp/missa-copy-lower-desktop.png" });
  await workspace.screenshot({ path: "/tmp/missa-workspace-desktop.png" });
  const audit = await new AxeBuilder({ page })
    .include(".missa-homepage-continuation")
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("failed and empty catalogue responses remain navigable; retry recovers", async ({
  page,
}) => {
  await page.route("**/api/opportunities?openNow=true&limit=12", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/#how-missa-works");
  const how = page.locator("#how-missa-works");
  await page.getByRole("tab", { name: "Applications", exact: true }).click();
  await expect(
    how.getByText("We couldn’t load the opportunities."),
  ).toBeVisible();
  await expect(
    page
      .locator("#homepage-workspace")
      .getByText("We couldn’t load these deadlines."),
  ).toBeVisible();
  await expect(
    how.getByRole("link", { name: "Browse opportunities" }),
  ).toHaveAttribute("href", "/opportunities");
  await page.unroute("**/api/opportunities?openNow=true&limit=12");
  await page.route("**/api/opportunities?openNow=true&limit=12", (route) =>
    route.fulfill({ json: { ...response, items: [], total: 0 } }),
  );
  await how.getByRole("button", { name: "Try again" }).click();
  await expect(how.getByText("No open opportunities to show.")).toBeVisible();
  await expect(
    page.getByText("No dated calls in this selection."),
  ).toBeVisible();
  await expect(
    how.getByRole("button", { name: "Browse opportunities" }),
  ).toHaveAttribute("href", "/opportunities");
  await page.unroute("**/api/opportunities?openNow=true&limit=12");
  await page.route("**/api/opportunities?openNow=true&limit=12", (route) =>
    route.fulfill({ json: response }),
  );
  await page.reload();
  await expect(how.locator("article")).toHaveCount(3);
  await expect(
    how.getByText("Fee not listed", { exact: true }).first(),
  ).toBeVisible();
});

test("mobile, long titles, 200 percent zoom, keyboard FAQ and accessibility", async ({
  page,
}) => {
  await page.route("**/api/opportunities?openNow=true&limit=12", (route) =>
    route.fulfill({ json: response }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#how-missa-works");
  await expect(page.locator("#how-missa-works article")).toHaveCount(3);
  await expect(page.locator("#places-to-know h3")).toHaveCount(6, {
    timeout: 20000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#how-missa-works")
    .screenshot({ path: "/tmp/missa-copy-cards-mobile.png" });
  await page
    .locator("#homepage-workspace")
    .screenshot({ path: "/tmp/missa-workspace-mobile.png" });
  const question = page.getByRole("button", {
    name: "Do I need an account?",
  });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText(/Browse opportunities and read the details without an account/),
  ).toBeVisible();
  await page
    .locator('[aria-labelledby="invitation-heading"]')
    .screenshot({ path: "/tmp/missa-copy-invitation-mobile.png" });
  const audit = await new AxeBuilder({ page })
    .include(".missa-homepage-continuation")
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({ content: "body { zoom: 2 }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#how-missa-works")
    .screenshot({ path: "/tmp/missa-copy-cards-zoom.png" });
  await page
    .locator("#homepage-workspace")
    .screenshot({ path: "/tmp/missa-workspace-zoom.png" });
});

test("anonymous Save uses the existing sign-in flow and preserves opportunity identity", async ({
  page,
}) => {
  await page.route("**/api/opportunities?openNow=true&limit=12", (route) =>
    route.fulfill({ json: response }),
  );
  let savedId = "";
  await page.route("**/api/journey/first-save/intent", async (route) => {
    savedId = route.request().postDataJSON().opportunityId;
    await route.fulfill({
      json: { authPath: "/login?next=%2Fopportunities%2Fhomepage_test-0" },
    });
  });
  await page.goto("/#how-missa-works");
  const save = page
    .locator("#how-missa-works article")
    .first()
    .getByRole("button", { name: /sign in required/ });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(savedId).toBe("homepage_test-0");
});

test("feature explorer: portfolio, notifications and goals respond without account writes", async ({
  page,
}) => {
  test.setTimeout(90000);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      /\/api\/(me|creator)\//.test(request.url()) &&
      request.method() !== "GET"
    )
      writes.push(request.url());
  });
  await page.goto("/#homepage-workspace");
  const section = page.locator("#homepage-workspace");
  const capture = async (path: string) => {
    await expect
      .poll(() =>
        section
          .locator("[data-feature]")
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
    const notification = section.locator('[aria-live="polite"] > div');
    if (await notification.count())
      await expect
        .poll(() =>
          notification.evaluate((element) => getComputedStyle(element).opacity),
        )
        .toBe("1");
    await section.screenshot({ path, animations: "disabled" });
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({
      reducedMotion: width === 390 ? "reduce" : "no-preference",
    });
    await section.getByRole("tab", { name: "Portfolio", exact: true }).click();
    await section
      .getByRole("button", { name: "White theme", exact: true })
      .click();
    await expect(
      section.getByRole("link", { name: "Build your portfolio" }),
    ).toHaveAttribute("href", "/profile/portfolio");
    const image = section.locator('img[src*="creator-preview-landscape"]');
    await expect
      .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
      .toBeGreaterThan(0);
    await capture(`.impeccable/review/features-portfolio-${width}.png`);
    await section
      .getByRole("button", { name: "Night theme", exact: true })
      .click();
    await expect(
      section.getByRole("button", { name: "Night theme", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      (await new AxeBuilder({ page }).include("#homepage-workspace").analyze())
        .violations,
    ).toEqual([]);
    await section.getByRole("button", { name: "Writing", exact: true }).click();
    await expect(
      section.getByRole("button", { name: "Read poem", exact: true }),
    ).toBeVisible();
    await expect(image).toHaveCount(0);
    await section.getByRole("button", { name: "Images", exact: true }).click();
    await expect(image).toBeVisible();
    await section.getByRole("tab", { name: "Portfolio", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      section.getByRole("tab", { name: "Applications", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      section.getByRole("tab", { name: "Applications", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    if (
      await section.getByText("We couldn’t load these deadlines.").isVisible()
    ) {
      await section
        .getByRole("button", { name: "Try again", exact: true })
        .click();
    }
    await expect(section.locator("tbody tr")).toHaveCount(3, {
      timeout: 30000,
    });
    await capture(`.impeccable/review/features-applications-${width}.png`);
    await section
      .getByRole("tab", { name: "Notifications", exact: true })
      .click();
    for (const name of [
      "Preview deadline reminders",
      "Preview opportunity updates",
      "Preview goal check-ins",
    ]) {
      const control = section.getByRole("switch", { name });
      if (await control.isChecked()) await control.click();
    }
    await expect(
      section.getByText("These notifications are off"),
    ).toBeVisible();
    await section
      .getByRole("switch", { name: "Preview deadline reminders" })
      .click();
    await expect(
      section.getByText("Reminder preview", { exact: true }),
    ).toBeVisible();
    await capture(`.impeccable/review/features-notifications-${width}.png`);
    expect(
      (await new AxeBuilder({ page }).include("#homepage-workspace").analyze())
        .violations,
    ).toEqual([]);
    await section.getByRole("tab", { name: "Goals", exact: true }).click();
    await section.getByRole("button", { name: "24", exact: true }).click();
    await expect(section.getByText("of 24 submitted")).toBeVisible();
    await section.getByRole("button", { name: "6", exact: true }).click();
    await expect(section.getByText("of 6 submitted")).toBeVisible();
    const addSample = section.getByRole("button", {
      name: "Add a sample submission",
      exact: true,
    });
    await addSample.click();
    await expect(section.getByText("5 more to go.")).toBeVisible();
    for (let i = 0; i < 5; i++) await addSample.click();
    await expect(section.getByText("You reached your goal!")).toBeVisible();
    await expect(addSample).toBeDisabled();
    await section.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(section.getByText("6 more to go.")).toBeVisible();
    await capture(`.impeccable/review/features-goals-${width}.png`);
    const directory = page.locator("#places-to-know");
    await expect(directory.locator("h3")).toHaveCount(6, { timeout: 20000 });
    await expect
      .poll(() =>
        directory
          .locator('img[alt="Building 945 at Headlands Center for the Arts"]')
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    await directory.screenshot({
      path: `.impeccable/review/directory-${width}.png`,
      animations: "disabled",
    });
    expect(
      (await new AxeBuilder({ page }).include("#places-to-know").analyze())
        .violations,
    ).toEqual([]);
    expect(
      (await new AxeBuilder({ page }).include("#homepage-workspace").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1266, height: 874 });
  await section.getByRole("tab", { name: "Portfolio", exact: true }).click();
  await section
    .getByRole("button", { name: "White theme", exact: true })
    .click();
  await capture(".impeccable/review/features-portfolio-1266.png");
  await page.setViewportSize({ width: 1082, height: 924 });
  await capture(".impeccable/review/features-portfolio-1082.png");
  await section.getByRole("tab", { name: "Goals", exact: true }).click();
  await capture(".impeccable/review/features-goals-1082.png");
  await page
    .locator("#places-to-know")
    .screenshot({
      path: ".impeccable/review/directory-1082.png",
      animations: "disabled",
    });
  expect(writes).toEqual([]);
});
