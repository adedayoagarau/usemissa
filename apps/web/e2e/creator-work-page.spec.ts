import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const route = "/design-system/creator-work-page";

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}

async function expectAccessible(page: Page) {
  const audit = await new AxeBuilder({ page })
    .include("[data-creator-theme]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
}

test("a work's page reads in order: title, facts, contents, parts, context, neighbours, rights", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);
  const main = page.locator("#main-content");

  const crumbs = page.getByRole("navigation", { name: "breadcrumb" });
  await expect(
    crumbs.getByRole("link", { name: "Riley Chen" }),
  ).toHaveAttribute("href", "/@rileychen");
  await expect(crumbs.getByRole("link", { name: "Work" })).toHaveAttribute(
    "href",
    "/@rileychen#profile-work",
  );
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(
    "An atlas of small departures",
  );

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "An atlas of small departures",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Poems, photographs and one recording, made on trains"),
  ).toBeVisible();
  await expect(page.getByText("2 poems · 1 plate · 1 recording")).toBeVisible();

  const facts = main.locator("dl").first();
  await expect(facts).toContainText("Year");
  await expect(facts).toContainText("Published in");
  await expect(
    facts.getByRole("link", { name: /^The Quiet Review/ }),
  ).toHaveAttribute("href", "https://example.com/quiet-review/issue-14");
  await expect(facts).toContainText(", Issue 14");
  await expect(facts).toContainText("Made during");
  await expect(facts).toContainText("Saltmarsh Writers’ House residency");
  await expect(facts).toContainText("Supported by");
  await expect(facts).toContainText("Coastline Arts Fund");
  await expect(
    facts.getByRole("button", { name: /^Confirmed\. What this means/ }),
  ).toBeVisible();

  // Parts come in the creator's order, after the contents list.
  const headings = await main
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(headings).toEqual([
    "Contents",
    "Window",
    "Platform 4",
    "Plate",
    "Between Perth and Inverness",
    "About this work",
  ]);
  await expect(main.getByText("The train window holds the lake")).toBeVisible();

  // Context, credits and the publisher card.
  await expect(main.getByText("Riley rode the same three lines")).toBeVisible();
  const credits = main.getByRole("heading", { name: "Credits" });
  await expect(credits).toBeVisible();
  await expect(main.getByText("Harbour Print Studio")).toBeVisible();
  const publisher = main.getByRole("complementary", { name: "Publication" });
  await expect(publisher).toContainText("The Quiet Review");
  await expect(publisher).toContainText("recorded this outcome on Missa");
  await expect(
    publisher.getByRole("link", { name: /Read on example\.com/ }),
  ).toHaveAttribute("target", "_blank");

  // The atlas is first, so there is a Next and no Previous.
  const more = page.getByRole("navigation", { name: "More work" });
  await expect(
    more.getByRole("link", { name: /Next\s*Tidal glossary/ }),
  ).toHaveAttribute("href", "/@rileychen/tidal-glossary");
  await expect(more.getByText("Previous")).toHaveCount(0);

  // The default rights line, and a way to ask.
  await expect(
    main.getByText("© Riley Chen 2026. Shared here for reading."),
  ).toBeVisible();
  await expect(main.getByText("usemissa.com/@rileychen/atlas")).toBeVisible();
});

test("the contents list jumps to a part and marks where you are", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(`${route}?variant=full`);
  const contents = page.getByRole("navigation", { name: "Contents" });
  await expect(contents.getByRole("link")).toHaveCount(13);
  await expect(contents.getByRole("link", { name: /Window/ })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await contents.getByRole("link", { name: /Fog notes/ }).click();
  await expect(page).toHaveURL(/#part-9$/);
  await expect(
    page.getByRole("heading", { name: "Fog notes" }),
  ).toBeInViewport();
  await expect(
    contents.getByRole("link", { name: /Fog notes/ }),
  ).toHaveAttribute("aria-current", "location");
  await expect(contents.locator('a[aria-current="location"]')).toHaveCount(1);
  // The list stays in view beside a long reading.
  const box = await contents.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect(box?.y).toBeLessThan(100);
});

test("consecutive plates sit together and keep their captions", async ({
  page,
}) => {
  await page.goto(`${route}?variant=full`);
  const plates = page.getByRole("region", { name: "Plates" });
  await expect(plates.locator("figure")).toHaveCount(3);
  await expect(plates.getByText("Low tide, Elie")).toBeVisible();
  await expect(plates.getByText("Plate 2 of 3")).toBeVisible();
  await expect(
    plates.getByRole("img", { name: "Mist settling in a valley" }),
  ).toBeVisible();
});

test("a work with one part or none has no counts or contents", async ({
  page,
}) => {
  await page.goto(`${route}?variant=plain`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tidal glossary" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Contents" })).toHaveCount(
    0,
  );
  await expect(page.locator('p[class*="counts"]')).toHaveCount(0);
  await expect(
    page.getByText("Ebb: what the water owes the shore."),
  ).toBeVisible();
  // Its own text keeps line breaks, split into stanzas.
  await expect(page.locator('[class*="reading"] p')).toHaveCount(2);
  // The publication that names it is on the record, so it is a fact too.
  await expect(page.locator("dl").first()).toContainText("Published in");
  // Both neighbours exist for a work in the middle.
  const more = page.getByRole("navigation", { name: "More work" });
  await expect(more.getByRole("link")).toHaveCount(2);
});

test("a publisher linked to the directory offers its profile", async ({
  page,
}) => {
  await page.goto(`${route}?variant=noimage`);
  const publisher = page.getByRole("complementary", { name: "Publication" });
  await expect(publisher).toContainText("Literary journal");
  await expect(publisher).toContainText("matched this to The Quiet Review");
  await expect(
    publisher.getByRole("link", { name: "Journal profile" }),
  ).toHaveAttribute("href", "/journal/the-quiet-review");
  await expect(
    page
      .locator("dl")
      .first()
      .getByRole("button", { name: /^Linked\. What this means/ }),
  ).toBeVisible();
});

test("a work with nothing on its page says so", async ({ page }) => {
  await page.goto(`${route}?variant=bare`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Untitled sketch" }),
  ).toBeVisible();
  await expect(
    page.getByText("Riley hasn’t added anything to this page yet."),
  ).toBeVisible();
  await expectAccessible(page);
});

test("rights: the creator's own words replace the default", async ({
  page,
}) => {
  await page.goto(`${route}?variant=long`);
  const rights = page.getByText(
    "All rights reserved. Quotation of up to five lines",
  );
  await expect(rights).toBeVisible();
  await expect(page.getByText("Shared here for reading.")).toHaveCount(0);
});

test("get in touch about permissions opens the profile's message form", async ({
  page,
}) => {
  await page.goto(route);
  await page
    .getByRole("button", { name: "For permissions, get in touch." })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Write to Riley");
  await expect(dialog.getByLabel("What it’s about")).toHaveValue("publication");
  await expect(dialog.getByLabel("Message")).toHaveValue(
    "About “An atlas of small departures”: ",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "For permissions, get in touch." }),
  ).toBeFocused();
});

test("a picture that can't load says so and offers Try again", async ({
  page,
}) => {
  let blocked = true;
  await page.route("**/media/home/portfolio-still-life.webp", (route) =>
    blocked ? route.abort() : route.continue(),
  );
  await page.goto(route);
  await page
    .getByRole("heading", { name: "Plate", exact: true })
    .scrollIntoViewIfNeeded();
  const alert = page.getByRole("alert").filter({
    hasText: "The image didn’t load. The work is still here.",
  });
  await expect(alert).toBeVisible();
  // The rest of the page is where it was.
  await expect(page.getByRole("heading", { name: "Platform 4" })).toBeVisible();
  blocked = false;
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(alert).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: /A table by a window with a bowl/ }),
  ).toBeVisible();
});

test("a recording that can't play says so and offers Try again", async ({
  page,
}) => {
  await page.route("**/creator-work-page/recording.wav", (route) =>
    route.abort(),
  );
  await page.goto(route, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Play Between Perth and Inverness" })
    .click();
  const alert = page.getByRole("alert").filter({
    hasText: "Couldn’t play this recording",
  });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Nothing was lost");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("every theme is readable and accessible", async ({ page }) => {
  for (const theme of ["default", "sage", "mineral", "night"]) {
    await page.goto(`${route}?variant=full&theme=${theme}`);
    await expect(page.locator("[data-creator-theme]").first()).toHaveAttribute(
      "data-creator-theme",
      theme,
    );
    await expectAccessible(page);
  }
});

test("long content stays inside the screen at 1280, 640, 390 and 320", async ({
  page,
}) => {
  for (const variant of ["long", "sixty", "full"]) {
    await page.goto(`${route}?variant=${variant}`);
    for (const width of [1280, 640, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoOverflow(page);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});

test("on a phone the contents fold into one button and every control is 44px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${route}?variant=sixty`);
  const toggle = page.getByRole("button", { name: /^Contents/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: /Station 12/ })).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /Station 12/ })).toHaveCount(1);
  await page.getByRole("link", { name: /Station 12/ }).click();
  await expect(page).toHaveURL(/#part-12$/);
  // Choosing a part folds the list again.
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Links inside a sentence or a fact are inline text; every other control is 44px.
  for (const control of await page
    .locator("#main-content a:visible, #main-content button:visible")
    .all()) {
    if (
      await control.evaluate((element) =>
        Boolean(element.closest("dd, p, li > p")),
      )
    )
      continue;
    const box = await control.boundingBox();
    if (!box) continue;
    expect(box.height, await control.innerText()).toBeGreaterThanOrEqual(43.5);
  }
  await expectNoOverflow(page);
  await expectAccessible(page);
});

test("it works by keyboard and shows where focus is", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);
  const crumb = page
    .getByRole("navigation", { name: "breadcrumb" })
    .getByRole("link", { name: "Riley Chen" });
  await crumb.focus();
  await expect(crumb).toBeFocused();
  const ring = await crumb.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(ring).toEqual({ width: "2px", style: "solid" });

  const contents = page.getByRole("navigation", { name: "Contents" });
  await contents.getByRole("link", { name: /Platform 4/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#part-2$/);

  const shared = page.getByRole("button", { name: "Share this work" });
  await shared.focus();
  await expect(shared).toBeFocused();
});

test("reduced motion removes the contents list's transition", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  const icon = page.getByRole("button", { name: /^Contents/ }).locator("svg");
  expect(
    await icon.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test("the page at 200% zoom has no sideways scroll", async ({ page }) => {
  // 200% zoom of a 1280px window is a 640px layout viewport.
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto(`${route}?variant=long`);
  await expectNoOverflow(page);
  await page.setViewportSize({ width: 320, height: 450 });
  await expectNoOverflow(page);
  await expectAccessible(page);
});
