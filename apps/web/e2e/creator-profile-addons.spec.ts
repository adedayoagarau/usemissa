import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SAMPLE = "/design-system/creator-profile-v2";
const REVIEW = "/design-system/creator-profile-addons";
const THEMES = ["default", "sage", "mineral", "night"] as const;
const WIDTHS = [1280, 640, 390, 320] as const;
const SECTIONS = [
  "editions",
  "shows",
  "services",
  "teaching",
  "support",
] as const;

const region = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}

async function expectAccessible(page: Page) {
  let audit = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21aa",
  ]);
  for (const id of SECTIONS) {
    if (await page.locator(`#profile-${id}`).count())
      audit = audit.include(`#profile-${id}`);
  }
  expect((await audit.analyze()).violations).toEqual([]);
}

test("the sample shows all five add-ons, and each reads as drawn", async ({
  page,
}) => {
  await page.goto(SAMPLE);
  const nav = page.getByRole("navigation", { name: "Profile sections" });
  for (const label of ["Editions", "Shows", "Services", "Teaching", "Support"])
    await expect(nav.getByRole("link", { name: label })).toBeVisible();

  const editions = region(page, "Editions");
  await expect(
    editions.getByRole("heading", { name: "Indigo Hours III", level: 3 }),
  ).toBeVisible();
  await expect(editions).toContainText("Relief print · 56 × 76 cm");
  await expect(editions).toContainText("4 of 12 available");
  await expect(
    editions.getByRole("img", { name: /Indigo Hours III/ }),
  ).toBeVisible();

  const shows = region(page, "Shows and performances");
  const years = shows.getByRole("heading", { level: 3 });
  const labels = await years.allTextContents();
  expect(labels.length).toBeGreaterThanOrEqual(2);
  expect([...labels].sort().reverse()).toEqual(labels);
  await expect(shows).toContainText("Solo");
  await expect(shows).toContainText("Premiere");

  const services = region(page, "Services");
  await expect(services).toContainText("Commissioned poems");
  await expect(services).toContainText("3–4 weeks");
  await expect(services).toContainText("On request");

  const teaching = region(page, "Teaching");
  await expect(teaching).toContainText("Writing from sound, two days");
  await expect(teaching).toContainText("Lisbon");
  await expect(teaching).toContainText("3 places left");

  const support = region(page, "Support");
  await expect(support).toContainText("Support Riley’s next collection");
  await expect(support).toContainText("Payments happen outside Missa.");
});

test("Support leaves Missa in a new tab and says so", async ({ page }) => {
  await page.goto(SAMPLE);
  const link = region(page, "Support").getByRole("link");
  await expect(link).toHaveAttribute(
    "href",
    "https://example.com/support-riley",
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noreferrer/);
  await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
  await expect(region(page, "Support")).toContainText(
    "Opens example.com in a new tab. Payments happen outside Missa.",
  );
});

test("each action opens the message form with the right topic and first line", async ({
  page,
}) => {
  await page.goto(SAMPLE);
  const message = page.getByLabel("Message");
  const topic = page.getByLabel(/What it.s about/);

  await region(page, "Editions")
    .getByRole("button", { name: "Enquire about Indigo Hours III" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(topic).toHaveValue("commission");
  await expect(message).toHaveValue("About Indigo Hours III: ");
  await page.keyboard.press("Escape");

  await region(page, "Services")
    .getByRole("button", { name: "Get in touch about Commissioned poems" })
    .click();
  await expect(topic).toHaveValue("commission");
  await expect(message).toHaveValue("About Commissioned poems: ");
  await page.keyboard.press("Escape");

  const request = region(page, "Teaching").getByRole("button", {
    name: "Request a place on Writing from sound, two days",
  });
  await request.focus();
  await page.keyboard.press("Enter");
  await expect(topic).toHaveValue("booking");
  await expect(message).toHaveValue("About Writing from sound, two days: ");
  await page.keyboard.press("Escape");
  await expect(request).toBeFocused();
});

for (const theme of THEMES) {
  test(`the five sections fit and pass axe at every width on the ${theme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${SAMPLE}?theme=${theme}`);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoOverflow(page);
      await expectAccessible(page);
    }
    await page.goto(`${REVIEW}?theme=${theme}&case=full`);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoOverflow(page);
      await expectAccessible(page);
    }
  });
}

test("a full profile covers every edition, show, service and session state", async ({
  page,
}) => {
  await page.goto(`${REVIEW}?case=full`);

  const editions = region(page, "Editions");
  await expect(editions.locator("article")).toHaveCount(4);
  await expect(editions).toContainText("1 of 12 available");
  await expect(editions).toContainText("Sold out");
  // Only the size is known: no availability, never "0 of 25".
  await expect(editions).toContainText("Edition of 25");
  await expect(editions).not.toContainText("of 25 available");
  // A picture that does not load becomes a type-only plate, never an empty box.
  await expect(editions.getByRole("img", { name: /Tide table/ })).toHaveCount(
    0,
  );
  await expect(
    editions.getByRole("img", { name: /Salt ledger/ }),
  ).toBeVisible();
  const soldOut = editions.getByRole("button", {
    name: "Ask about another print (Salt ledger)",
  });
  await expect(soldOut).toBeVisible();
  await expect(
    editions.getByRole("button", { name: "Enquire about Salt ledger" }),
  ).toHaveCount(0);
  await soldOut.click();
  await expect(page.getByLabel("Message")).toHaveValue(
    "About another print like Salt ledger: ",
  );
  await page.keyboard.press("Escape");

  const shows = region(page, "Shows and performances");
  expect(
    await shows.getByRole("heading", { level: 3 }).allTextContents(),
  ).toEqual([
    String(new Date().getUTCFullYear()),
    String(new Date().getUTCFullYear() - 1),
    String(new Date().getUTCFullYear() - 3),
    "Undated",
  ]);
  await expect(shows).toContainText("Screening");
  const linked = shows.getByRole("link", { name: /Indigo Hours/ });
  await expect(linked).toHaveAttribute("target", "_blank");
  await expect(linked).toHaveAccessibleName(/\(opens in a new tab\)/);
  await expect(shows.getByRole("link")).toHaveCount(1);
  await linked.focus();
  await expect(linked).toBeFocused();
  expect(await linked.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );

  const services = region(page, "Services");
  await expect(services.locator("article")).toHaveCount(3);
  // Rates are optional: a service without one shows none, not a blank.
  await expect(services.getByText("Rates", { exact: true })).toHaveCount(1);
  await expect(
    services.getByText("Typical timing", { exact: true }),
  ).toHaveCount(2);

  const teaching = region(page, "Teaching");
  // The session that already happened is never shown.
  await expect(teaching.locator("article")).toHaveCount(4);
  await expect(teaching).not.toContainText("already happened");
  await expect(teaching).toContainText("3 places left");
  await expect(teaching).toContainText("12 places left");
  await expect(teaching).toContainText("Full");
  await expect(teaching).toContainText("Date not confirmed");
  await expect(
    teaching.getByRole("button", {
      name: "Ask about the next one (Relief printing for beginners)",
    }),
  ).toBeVisible();
  // Places are shown only when stated.
  await expect(
    teaching.locator("article", { hasText: "An open studio afternoon" }),
  ).not.toContainText(/places? left|Full/);
});

test("the least a creator can enter still looks finished", async ({ page }) => {
  await page.goto(`${REVIEW}?case=bare`);
  const editions = region(page, "Editions");
  await expect(
    editions.getByRole("heading", { name: "Tide table", level: 3 }),
  ).toBeVisible();
  await expect(editions).not.toContainText("available");
  await expect(editions).not.toContainText("Sold out");
  await expect(region(page, "Services")).not.toContainText("Rates");
  await expect(region(page, "Teaching")).not.toContainText(/places? left|Full/);
  await expect(region(page, "Support")).toContainText("Support Riley Chen");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
  }
  await expectAccessible(page);
});

test("very long text wraps instead of overflowing, even at 320px and 200% zoom", async ({
  page,
}) => {
  await page.goto(`${REVIEW}?case=long&theme=mineral`);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page);
  }
  await expectAccessible(page);
  // 200% zoom of a 1280px window is a 640px layout at twice the size.
  await page.setViewportSize({ width: 640, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expectNoOverflow(page);
  const action = region(page, "Support").getByRole("link");
  const box = await action.boundingBox();
  const section = await region(page, "Support").boundingBox();
  expect(
    box && section && box.x + box.width <= section.x + section.width + 1,
  ).toBe(true);
});

test("with no way to write, the sections leave out their actions but keep their content", async ({
  page,
}) => {
  await page.goto(`${REVIEW}?case=full&contact=off`);
  for (const name of ["Editions", "Services", "Teaching"])
    await expect(region(page, name).getByRole("button")).toHaveCount(0);
  await expect(region(page, "Editions")).toContainText("4 of 12 available");
  await expect(region(page, "Teaching")).toContainText("3 places left");
  await expect(region(page, "Editions")).not.toContainText("by enquiry");
  await expect(region(page, "Support").getByRole("link")).toBeVisible();
  await expectAccessible(page);
});

test("add-ons with nothing to show leave no empty sections behind", async ({
  page,
}) => {
  await page.goto(`${REVIEW}?case=empty`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const id of SECTIONS)
    await expect(page.locator(`#profile-${id}`)).toHaveCount(0);
});
