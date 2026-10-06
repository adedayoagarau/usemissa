import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const browse = (page: Page) =>
  page.getByRole("region", { name: "Open opportunities" });

test("the homepage leads with the live catalogue and its real filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next open call." }),
  ).toBeVisible();
  const cards = browse(page).getByRole("article");
  await expect(cards.first()).toBeVisible();
  const before = await cards.count();
  expect(before).toBeGreaterThan(0);

  // The same filter model as /opportunities, kept in the homepage URL.
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("option", { name: /Magazine/ }).click();
  await expect(page).toHaveURL(/^[^?]*\/\?.*type=magazine/, { timeout: 20_000 });
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card).toContainText("Magazine");
  }
  await expect(
    page.getByRole("link", { name: /See all .* open opportunities|Open the full catalogue/ }),
  ).toHaveAttribute("href", /\/opportunities\?.*type=magazine/);

  // Opening a call uses the catalogue route.
  const firstTitle = cards.first().getByRole("heading", { level: 2 }).getByRole("link");
  const title = (await firstTitle.textContent())?.trim();
  await firstTitle.click();
  await expect(page).toHaveURL(/\/opportunities\/[^/?]+/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(title ?? "");
});

test("a signed-out shortlist survives reload and offers to keep it", async ({
  page,
}) => {
  await page.goto("/");
  const cards = browse(page).getByRole("article");
  await expect(cards.first()).toBeVisible();

  await expect(page.getByRole("region", { name: "Shortlist", exact: true })).toHaveCount(0);
  const toggle = cards.first().getByRole("button", { name: /^Shortlist / });
  const label = await toggle.getAttribute("aria-label");
  const title = label?.replace(/^Shortlist /, "") ?? "";
  await toggle.click();
  await expect(
    cards.first().getByRole("button", { name: `Remove ${title} from your shortlist` }),
  ).toHaveAttribute("aria-pressed", "true");

  const bar = page.getByRole("region", { name: "Shortlist", exact: true });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("1 call on this device");
  await expect(bar.getByRole("link", { name: title })).toHaveAttribute(
    "href",
    /\/opportunities\//,
  );
  await expect(
    bar.getByRole("link", { name: "Create an account to keep it" }),
  ).toHaveAttribute("href", "/signup?next=%2Fopportunities");

  await page.reload();
  await expect(page.getByRole("region", { name: "Shortlist", exact: true })).toContainText(
    "1 call on this device",
  );
  await expect(
    browse(page)
      .getByRole("article")
      .first()
      .getByRole("button", { name: `Remove ${title} from your shortlist` }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("region", { name: "Shortlist", exact: true })
    .getByRole("button", { name: "Clear" })
    .click();
  await expect(page.getByRole("region", { name: "Shortlist", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("missa.shortlist.v1"))).toBeNull();
});

test("phone layout keeps filters, cards and footer usable without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next open call." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();

  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filter opportunities" })).toBeVisible();
  await page.keyboard.press("Escape");

  const toggle = browse(page).getByRole("button", { name: /^Shortlist / }).first();
  const box = await toggle.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await expect(
    page
      .getByRole("navigation", { name: "Homepage footer navigation" })
      .getByRole("link", { name: "Opportunities", exact: true }),
  ).toHaveAttribute("href", "/opportunities");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test("product excerpts are labelled as examples and the page passes axe", async ({
  page,
}) => {
  await page.goto("/");
  const proof = page.getByRole("region", { name: "Everything after you find the call." });
  await proof.scrollIntoViewIfNeeded();
  await expect(proof.getByRole("article", { name: "Keep every deadline in one view." })).toBeVisible();
  await expect(page.getByText("Example, built from calls open today")).toBeVisible();
  await expect(proof.getByRole("article", { name: "A nudge before it closes." })).toBeVisible();
  await expect(
    proof.getByRole("link", { name: "Choose your reminders" }),
  ).toHaveAttribute("href", "/tracker");
  await expect(
    proof.getByRole("article", { name: "One page for the work you make." }),
  ).toContainText("Example, a fictional creator");
  // A block jumped past still reveals: nothing stays at opacity 0.
  await page.getByRole("heading", { name: "Questions about Missa." }).scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll("section[aria-labelledby='homepage-proof-heading'] article")]
          .map((el) => getComputedStyle(el.parentElement!).opacity),
      ),
    )
    .toEqual(["1", "1", "1"]);
  await page.getByRole("button", { name: "Do I need an account?" }).click();
  await expect(page.getByText("Browse opportunities and read the details without an account.")).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("hero motion holds on tap or keyboard and stays still under reduced motion", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Find your next open call." }),
  ).toBeVisible();
  const tour = page.getByRole("button", { name: "Pause the product animation" });
  await expect(tour).toHaveAttribute("aria-pressed", "false");
  await tour.click();
  const held = page.getByRole("button", { name: "Play the product animation" });
  await expect(held).toHaveAttribute("aria-pressed", "true");
  await held.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Pause the product animation" }),
  ).toHaveAttribute("aria-pressed", "false");

  const still = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const stillPage = await still.newPage();
  const hydrationErrors: string[] = [];
  stillPage.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  stillPage.on("pageerror", (error) => {
    if (/hydrat/i.test(String(error))) hydrationErrors.push(String(error));
  });
  await stillPage.goto(page.url());
  await expect(stillPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    stillPage.getByRole("button", { name: /product animation$/ }),
  ).toHaveCount(0);
  // The server cannot know the preference; the page must still hydrate cleanly.
  expect(hydrationErrors).toEqual([]);
  await still.close();
});
