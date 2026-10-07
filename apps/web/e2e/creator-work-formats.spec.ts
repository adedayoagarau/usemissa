import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Work formats on the public profile: plates and series, wall labels, film,
 * listening, chapters, transcripts, case studies, and the card and player
 * states. Runs against the fictional craft creators (`?craft=`), which need
 * no database.
 */

const craft = (name: string) =>
  `/design-system/creator-profile-v2?craft=${name}`;
const work = (page: Page) =>
  page.getByRole("region", { name: "Selected work" });
const cards = (page: Page) => work(page).locator("article");
const dialog = (page: Page) => page.getByRole("dialog");
const miniPlayer = (page: Page) =>
  page.getByRole("region", { name: "Now playing" });

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}

async function expectAccessible(page: Page, include = "main") {
  const audit = await new AxeBuilder({ page })
    .include(include)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
}

test.describe("plates and series", () => {
  test("works that share a series sit under its heading with a plate count", async ({
    page,
  }) => {
    await page.goto(craft("visual"));
    const section = work(page);
    await expect(
      section.getByRole("heading", { name: "Indigo Hours", level: 3 }),
    ).toBeVisible();
    await expect(section.getByText("3 plates · 2025–26")).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Salt and Iron", level: 3 }),
    ).toBeVisible();
    await expect(section.getByText("2 plates · 2024")).toBeVisible();
    // The series' own works are one level below its heading.
    await expect(
      section.getByRole("heading", { name: "Indigo Hours III", level: 4 }),
    ).toBeVisible();
    // The featured work is in the hero, so six remain in the grid.
    await expect(cards(page)).toHaveCount(6);
  });

  test("a card carries its wall label and the dialog prints it in full", async ({
    page,
  }) => {
    await page.goto(craft("visual"));
    const card = cards(page).filter({ hasText: "Indigo Hours III" });
    await expect(
      card.getByText("Relief print on Kozo paper · 56 × 76 cm · Edition of 12"),
    ).toBeVisible();
    await card
      .getByRole("button", { name: "Indigo Hours III", exact: true })
      .click();
    const figure = dialog(page).locator("figcaption");
    await expect(figure).toContainText("Indigo Hours III, 2025");
    await expect(figure).toContainText(
      "Relief print on Kozo paper · 56 × 76 cm · Edition of 12",
    );
  });

  test("the filter gains Series only when a series exists, and says what it shows", async ({
    page,
  }) => {
    await page.goto("/design-system/creator-profile-v2");
    await expect(page.getByRole("button", { name: "Series" })).toHaveCount(0);

    await page.goto(craft("visual"));
    const series = page.getByRole("button", { name: "Series", exact: true });
    await expect(series).toBeVisible();
    await expect(series).toHaveAttribute("aria-pressed", "false");
    await series.click();
    await expect(series).toHaveAttribute("aria-pressed", "true");
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByText("Showing 5 works in a series.")).toBeAttached();
    await expect(
      work(page).getByRole("heading", { name: "Notes on indigo" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "All work", exact: true }).click();
    await expect(cards(page)).toHaveCount(6);
  });

  test("a film is a format of its own, and its poster does not make it a work of images", async ({
    page,
  }) => {
    // Every work here is a film, so there is nothing to filter between.
    await page.goto(craft("film"));
    await expect(
      page.getByRole("group", { name: "Filter work by format" }),
    ).toHaveCount(0);

    await page.goto(craft("sound"));
    const filters = page.getByRole("group", { name: "Filter work by format" });
    await expect(filters.getByRole("button")).toHaveText([
      "All work",
      "Film",
      "Images",
      "Sound",
    ]);
    await filters.getByRole("button", { name: "Film", exact: true }).click();
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByText("Showing 1 film work.")).toBeAttached();
  });
});

test.describe("film", () => {
  test("nothing loads from the provider until a visitor presses play", async ({
    page,
  }) => {
    const hosts = new Set<string>();
    page.on("request", (request) => hosts.add(new URL(request.url()).hostname));
    await page.route("https://player.vimeo.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>film</p>" }),
    );
    await page.goto(craft("film"));
    await page.waitForLoadState("networkidle");
    expect(
      [...hosts].filter((host) => /youtube|vimeo|ytimg/.test(host)),
    ).toEqual([]);
    await expect(page.locator("iframe")).toHaveCount(0);

    // Opening the work by its title still loads nothing.
    await cards(page)
      .filter({ hasText: "Low tide" })
      .getByRole("button", { name: "Low tide", exact: true })
      .click();
    await expect(dialog(page)).toContainText(
      "Plays from Vimeo. Nothing loads from Vimeo until you press play.",
    );
    await expect(page.locator("iframe")).toHaveCount(0);
    expect([...hosts].filter((host) => /youtube|vimeo/.test(host))).toEqual([]);

    await dialog(page)
      .getByRole("button", { name: "Play Low tide from Vimeo" })
      .click();
    const frame = page.locator("iframe");
    await expect(frame).toHaveCount(1);
    const src = (await frame.getAttribute("src")) ?? "";
    expect(src).toMatch(
      /^https:\/\/player\.vimeo\.com\/video\/123456789\?.*dnt=1/,
    );
    expect(src).toContain("h=a1b2c3d4e5");
    await expect(frame).toHaveAttribute("title", "Low tide (Vimeo)");
    await expect(dialog(page)).toContainText("Playing from Vimeo.");
  });

  test("pressing play on a card opens the work with the film already begun", async ({
    page,
  }) => {
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>film</p>" }),
    );
    await page.goto(craft("film"));
    await cards(page)
      .filter({ hasText: "The long way home" })
      .getByRole("button", { name: "Play The long way home" })
      .click();
    const frame = dialog(page).locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/M7lc1UVf-VE\?.*autoplay=1/,
    );
  });

  test("a chapter jumps the film to its time", async ({ page }) => {
    await page.route("https://player.vimeo.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>film</p>" }),
    );
    await page.goto(craft("film"));
    await cards(page)
      .filter({ hasText: "Low tide" })
      .getByRole("button", { name: "Low tide", exact: true })
      .click();
    const chapters = dialog(page).getByRole("navigation", { name: "Chapters" });
    await expect(chapters.getByRole("button")).toHaveCount(4);
    await chapters.getByRole("button", { name: /The tide table/ }).click();
    await expect(dialog(page).locator("iframe")).toHaveAttribute(
      "src",
      /#t=192s$/,
    );
    await chapters.getByRole("button", { name: /Credits/ }).click();
    await expect(dialog(page).locator("iframe")).toHaveAttribute(
      "src",
      /#t=3750s$/,
    );
  });

  test("any other film link opens as an ordinary link", async ({ page }) => {
    await page.goto(craft("film"));
    const link = cards(page).getByRole("link", {
      name: /Watch Second skin on example\.com/,
    });
    await expect(link).toHaveAttribute(
      "href",
      "https://example.com/films/second-skin",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await cards(page)
      .filter({ hasText: "Second skin" })
      .getByRole("button", { name: "Second skin", exact: true })
      .click();
    await expect(dialog(page).locator("iframe")).toHaveCount(0);
    await expect(
      dialog(page).getByRole("link", { name: /Watch Second skin on example/ }),
    ).toBeVisible();
  });

  test("the transcript opens on request and hides again", async ({ page }) => {
    await page.goto(craft("film"));
    await cards(page)
      .filter({ hasText: "Low tide" })
      .getByRole("button", { name: "Low tide", exact: true })
      .click();
    const toggle = dialog(page).getByRole("button", {
      name: "Read the transcript",
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(dialog(page)).not.toContainText("You can read the tide off");
    await toggle.click();
    await expect(dialog(page)).toContainText("You can read the tide off");
    await expect(
      dialog(page).getByRole("button", { name: "Hide the transcript" }),
    ).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(dialog(page)).not.toContainText("You can read the tide off");
  });

  test("the content-security-policy frames only the two film hosts", async ({
    page,
  }) => {
    const response = await page.goto(craft("film"));
    const policy =
      response?.headers()["content-security-policy-report-only"] ?? "";
    const frames = policy
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("frame-src"));
    expect(frames).toBe(
      "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
    );
  });
});

test.describe("listening", () => {
  test("the mini player shows elapsed and total time, then pauses and closes", async ({
    page,
  }) => {
    await page.goto(craft("sound"));
    await expect(miniPlayer(page)).toHaveCount(0);
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Play Salt Hours" })
      .click();
    const player = miniPlayer(page);
    await expect(player).toBeVisible();
    await expect(
      player.getByRole("button", { name: "Pause Salt Hours" }),
    ).toBeVisible();
    // Elapsed and total, once the file has said how long it is.
    await expect(player).toContainText(/Played 00:0\d of 00:10/);
    await expect
      .poll(async () =>
        Number(
          await player
            .getByRole("progressbar", { name: "Playback position" })
            .getAttribute("aria-valuenow"),
        ),
      )
      .toBeGreaterThan(0);
    await expect(
      cards(page)
        .filter({ hasText: "Salt Hours" })
        .getByText("Playing", { exact: true }),
    ).toBeVisible();

    await player.getByRole("button", { name: "Pause Salt Hours" }).click();
    await expect(
      player.getByRole("button", { name: "Play Salt Hours" }),
    ).toBeVisible();
    await player.getByRole("button", { name: "Close player" }).click();
    await expect(miniPlayer(page)).toHaveCount(0);
  });

  test("a slow file shows a loading state before it plays", async ({
    page,
  }) => {
    await page.route("**/media/sample-tone.wav", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto(craft("sound"));
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Play Salt Hours" })
      .click();
    const player = miniPlayer(page);
    await expect(player).toHaveAttribute("data-status", "loading");
    await expect(player.getByText("Loading…")).toBeVisible();
    await expect(player).toHaveAttribute("data-status", "playing", {
      timeout: 10_000,
    });
  });

  test("a file that fails says so and Try again plays it", async ({ page }) => {
    await page.route("**/media/sample-tone.wav", (route) => route.abort());
    await page.goto(craft("sound"));
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Play Salt Hours" })
      .click();
    const player = miniPlayer(page);
    await expect(player).toHaveAttribute("data-status", "error");
    await expect(
      player.getByText("Couldn’t play this recording. Try again."),
    ).toBeVisible();

    await page.unroute("**/media/sample-tone.wav");
    await player.getByRole("button", { name: "Try Salt Hours again" }).click();
    await expect(player).toHaveAttribute("data-status", "playing");
  });

  test("chapters jump a recording to their time, and the transcript is there to read", async ({
    page,
  }) => {
    await page.goto(craft("sound"));
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Salt Hours", exact: true })
      .click();
    const panel = dialog(page);
    const chapters = panel.getByRole("navigation", { name: "Chapters" });
    await expect(chapters.getByRole("button")).toHaveCount(4);
    await chapters.getByRole("button", { name: /Water/ }).click();
    await expect(
      chapters.getByRole("button", { name: /Water/ }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      panel.getByRole("status").filter({ hasText: "Playing" }),
    ).toBeVisible();
    await expect(panel.getByText(/Played 00:0[6-9] of 00:10/)).toBeAttached();

    await panel.getByRole("button", { name: "Read the transcript" }).click();
    await expect(panel).toContainText("It does not hurry. It arrives.");
    // The recording keeps playing after the dialog is closed.
    await page.keyboard.press("Escape");
    await expect(miniPlayer(page)).toBeVisible();
  });

  test("a recording that fails offers Try again inside the dialog too", async ({
    page,
  }) => {
    await page.route("**/media/sample-tone.wav", (route) => route.abort());
    await page.goto(craft("sound"));
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Salt Hours", exact: true })
      .click();
    await dialog(page).getByRole("button", { name: "Play Salt Hours" }).click();
    await expect(
      dialog(page).getByText("Couldn’t play this recording"),
    ).toBeVisible();
    await page.unroute("**/media/sample-tone.wav");
    await dialog(page).getByRole("button", { name: "Try again" }).click();
    await expect(
      dialog(page).getByRole("button", { name: "Pause Salt Hours" }),
    ).toBeVisible();
  });
});

test.describe("case study", () => {
  test("brief, role, client and outcome are labelled facts, and a linked client links", async ({
    page,
  }) => {
    await page.goto(craft("design"));
    const card = cards(page).filter({
      hasText: "Harbour Arts Festival identity",
    });
    await expect(
      card.getByText("Case study · Harbour Arts Council"),
    ).toBeVisible();
    await card
      .getByRole("button", {
        name: "Harbour Arts Festival identity",
        exact: true,
      })
      .click();
    const facts = dialog(page).getByRole("region", { name: "Case study" });
    for (const [label, value] of [
      ["Brief", "A new identity for a coastal arts festival."],
      ["Role", "Lead designer, with two illustrators"],
      ["Client", "Harbour Arts Council"],
      ["Outcome", "Launched April 2026"],
    ])
      await expect(
        facts
          .locator("dt", { hasText: label })
          .locator("xpath=following-sibling::dd[1]"),
      ).toHaveText(value);
    await expect(
      facts.getByRole("link", { name: "Harbour Arts Council" }),
    ).toHaveAttribute("href", "/org/harbour-arts-council");
  });

  test("a client without a directory profile is plain text", async ({
    page,
  }) => {
    await page.goto(craft("design"));
    await cards(page)
      .filter({ hasText: "Ferry terminal wayfinding" })
      .getByRole("button", { name: /^Ferry terminal wayfinding/, exact: false })
      .last()
      .click();
    const facts = dialog(page).getByRole("region", { name: "Case study" });
    await expect(facts).toContainText("A regional harbour authority");
    await expect(facts.getByRole("link")).toHaveCount(0);
  });
});

test.describe("card states", () => {
  const IMAGE = "**/media/home/artist-at-work.webp";

  test("a picture that fails says the work is still there, and Try again fetches it", async ({
    page,
  }) => {
    await page.route(IMAGE, (route) => route.abort());
    await page.goto(craft("visual"));
    const card = cards(page).filter({
      hasText: "Indigo Hours I (in progress)",
    });
    await expect(
      card.getByText("The image didn’t load. The work is still here."),
    ).toBeVisible();
    // The work itself still opens.
    await card
      .getByRole("button", {
        name: "Indigo Hours I (in progress)",
        exact: true,
      })
      .click();
    await expect(
      dialog(page).getByRole("heading", {
        name: "Indigo Hours I (in progress)",
      }),
    ).toBeVisible();
    await expect(dialog(page)).toContainText("Graphite on paper · 30 × 40 cm");
    await page.keyboard.press("Escape");

    await page.unroute(IMAGE);
    await card.getByRole("button", { name: /^Try again/ }).click();
    const image = card.locator("img");
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
    await expect(
      card.getByText("The image didn’t load. The work is still here."),
    ).toHaveCount(0);
  });

  test("a picture still arriving holds its place with a skeleton", async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route(IMAGE, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(craft("visual"));
    const card = cards(page).filter({
      hasText: "Indigo Hours I (in progress)",
    });
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('[data-slot="skeleton"]')).toBeVisible();
    release();
    await expect(card.locator('[data-slot="skeleton"]')).toHaveCount(0);
  });

  test("keyboard: a card opens its work and focus comes back when it closes", async ({
    page,
  }) => {
    await page.goto(craft("visual"));
    const open = page.getByRole("button", { name: "Open Indigo Hours III" });
    await open.focus();
    // A visible ring, not the browser default of nothing.
    const outline = await open.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(open).toBeFocused();
  });
});

test.describe("every craft reads at every size", () => {
  for (const name of ["visual", "sound", "film", "design"]) {
    test(`${name}: no horizontal scroll, accessible, reduced motion`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(craft(name));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // 1280, then 200% zoom (640 css px), then phone and the narrowest phone.
      for (const width of [1280, 640, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await expectNoOverflow(page);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await expectAccessible(page);
    });
  }

  test("all four themes keep every format readable", async ({ page }) => {
    for (const theme of ["default", "sage", "mineral", "night"])
      for (const name of ["visual", "sound", "film"]) {
        await page.goto(`${craft(name)}&theme=${theme}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectAccessible(page);
      }
  });

  test("the mini player reads on every theme", async ({ page }) => {
    for (const theme of ["default", "sage", "mineral", "night"]) {
      await page.goto(`${craft("sound")}&theme=${theme}`);
      await cards(page)
        .filter({ hasText: "Salt Hours" })
        .getByRole("button", { name: "Play Salt Hours" })
        .click();
      await expect(miniPlayer(page)).toBeVisible();
      await expectAccessible(page, '[aria-label="Now playing"]');
    }
  });

  test("an open dialog fits a phone and passes axe, for each format", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, title] of [
      ["visual", "Indigo Hours III"],
      ["sound", "Salt Hours"],
      ["film", "Low tide"],
      ["design", "Harbour Arts Festival identity"],
    ]) {
      await page.goto(craft(name));
      await cards(page)
        .filter({ hasText: title })
        .getByRole("button", { name: title, exact: true })
        .click();
      await expect(dialog(page)).toBeVisible();
      await expectNoOverflow(page);
      await expectAccessible(page, '[role="dialog"]');
    }
  });

  test("the mini player fits a phone in every state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(craft("sound"));
    await cards(page)
      .filter({ hasText: "Salt Hours" })
      .getByRole("button", { name: "Play Salt Hours" })
      .click();
    await expect(miniPlayer(page)).toHaveAttribute(
      "data-status",
      /playing|loading/,
    );
    await expectNoOverflow(page);
    await expectAccessible(page, '[aria-label="Now playing"]');
  });
});
