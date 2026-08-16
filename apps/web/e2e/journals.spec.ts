import { expect, test, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip(
  process.env.JOURNALS_E2E_REAL_DATA !== "1",
  "This suite requires an explicitly enabled real profile repository.",
);

type ProfileCard = {
  id: string;
  kind: "literary_magazine" | "small_press";
  name: string;
  mediaUrl: string | null;
};

type DirectoryResponse = {
  items: ProfileCard[];
  total: number;
};

type LinkedOpportunity = {
  id: string;
  title: string;
  officialWebsite: string | null;
};

type ProfileDetailResponse = {
  opportunities?: LinkedOpportunity[];
};

type ProfileWithOpportunity = {
  item: ProfileCard;
  detail: ProfileDetailResponse;
  opportunity: LinkedOpportunity;
  canonicalAvailable: boolean;
};

async function directory(
  request: APIRequestContext,
  query = "",
): Promise<DirectoryResponse> {
  const response = await request.get(`/api/journals${query}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as DirectoryResponse;
}

test("publishes both profile kinds, keeps filters/search real, and opens linked opportunities", async ({
  page,
  request,
}) => {
  const all = await directory(request, "?limit=100");
  const magazines = await directory(request, "?kind=literary_magazine&limit=1");
  const presses = await directory(request, "?kind=small_press&limit=1");
  expect(all.total).toBeGreaterThan(0);
  expect(magazines.total).toBeGreaterThan(0);
  expect(presses.total).toBeGreaterThan(0);
  expect(magazines.items[0]?.kind).toBe("literary_magazine");
  expect(presses.items[0]?.kind).toBe("small_press");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/journals?kind=small_press");
  await expect(page.locator("#journal-kind")).toHaveValue("small_press");
  await expect(page).toHaveURL(/kind=small_press/);

  const press = presses.items[0]!;
  await page.getByRole("textbox", { name: "Search" }).fill(press.name);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `q=${encodeURIComponent(press.name).replace(/%20/g, "(?:%20|\\+)")}`,
    ),
  );
  await expect(
    page.getByRole("heading", { name: press.name, exact: true }),
  ).toBeVisible();

  const profileWithOpportunity =
    await (async (): Promise<ProfileWithOpportunity | null> => {
      let fallback: ProfileWithOpportunity | null = null;
      for (const item of all.items) {
        const response = await request.get(
          `/api/journals/${encodeURIComponent(item.id)}`,
        );
        if (!response.ok()) continue;
        const detail = (await response.json()) as ProfileDetailResponse;
        for (const opportunity of detail.opportunities ?? []) {
          const canonical = await request.get(
            `/api/opportunities/${encodeURIComponent(opportunity.id)}`,
          );
          const candidate = {
            item,
            detail,
            opportunity,
            canonicalAvailable: canonical.ok(),
          };
          if (canonical.ok()) return candidate;
          fallback ??= candidate;
        }
      }
      return fallback;
    })();
  expect(profileWithOpportunity).not.toBeNull();
  const opportunity = profileWithOpportunity!.opportunity;
  expect(opportunity.id).toBeTruthy();

  for (const profileCase of [
    {
      profile: magazines.items[0]!,
      label: "Literary journal",
      field: "Unsolicited submissions",
    },
    { profile: presses.items[0]!, label: "Small press", field: "Book types" },
  ]) {
    await page.goto(`/journals/${encodeURIComponent(profileCase.profile.id)}`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: profileCase.profile.name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(profileCase.label, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "What they publish" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Submission details" }),
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(profileCase.field, "i")).first(),
    ).toBeVisible();
    await expect(page.locator('main header [role="status"]')).toBeVisible();
    if (profileCase.profile.mediaUrl) {
      const mediaResponse = await request.get(
        `/api/journals/${encodeURIComponent(profileCase.profile.id)}/media`,
      );
      expect(mediaResponse.status()).toBe(200);
      expect(mediaResponse.headers()["content-type"]).toMatch(/^image\//);
      const image = page.locator("main img").first();
      await expect
        .poll(async () =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBeGreaterThan(0);
    } else {
      await expect(page.locator('main header [role="img"]')).toBeVisible();
      await expect(page.locator('main header [role="img"]')).not.toContainText(
        "Image not available",
      );
    }
    await expect(page.locator("body")).not.toContainText(
      /freshness|profile checked|confidence/i,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBeTruthy();
    await expect(
      page.getByText(/Original profile|Open source details/),
    ).toHaveCount(0);
    const detailInteractiveSizes = await page
      .locator("a, button:not(#next-logo), input, select")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
      );
    expect(
      Math.min(
        ...detailInteractiveSizes.map((size) =>
          Math.min(size.width, size.height),
        ),
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => Boolean(image.getAttribute("alt"))),
        ),
    ).toBeTruthy();
  }

  await page.goto(
    `/journals/${encodeURIComponent(profileWithOpportunity!.item.id)}`,
  );
  const missaOpportunityLink = page.locator(
    `a[href="/opportunities/${encodeURIComponent(opportunity.id)}"]`,
  );
  if (profileWithOpportunity!.canonicalAvailable) {
    await expect(missaOpportunityLink).toContainText(/opportunity on Missa/);
    await expect(missaOpportunityLink).not.toHaveAttribute("target", "_blank");
  } else {
    await expect(missaOpportunityLink).toHaveCount(0);
    await expect(
      page.getByText("Missa detail unavailable to signed-out viewers", {
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", {
      name: new RegExp(`Sign in to save ${opportunity.title} to Tracker`),
    }),
  ).toHaveAttribute("href", /\/login\?next=.*intent=save/);
  await expect(
    page.getByText(/Original profile|Open source details/),
  ).toHaveCount(0);
  if (profileWithOpportunity!.canonicalAvailable) {
    await missaOpportunityLink.click();
    await expect(page).toHaveURL(
      `/opportunities/${encodeURIComponent(opportunity.id)}`,
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign in to save/ }),
    ).toBeVisible();
  }
});

test("completes the profile to opportunity detail to Tracker path", async ({
  page,
  request,
}) => {
  const all = await directory(request, "?limit=100");
  const targeted = await directory(request, "?q=Black%20Lawrence&limit=10");
  let candidate: {
    profile: ProfileCard;
    opportunity: LinkedOpportunity;
  } | null = null;
  for (const profile of [...targeted.items, ...all.items]) {
    const detailResponse = await request.get(
      `/api/journals/${encodeURIComponent(profile.id)}`,
    );
    if (!detailResponse.ok()) continue;
    const detail = (await detailResponse.json()) as ProfileDetailResponse;
    for (const opportunity of detail.opportunities ?? []) {
      const canonical = await request.get(
        `/api/opportunities/${encodeURIComponent(opportunity.id)}`,
      );
      if (canonical.ok()) {
        candidate = { profile, opportunity };
        break;
      }
    }
    if (candidate) break;
  }
  expect(candidate).not.toBeNull();

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post("/api/auth/signup", {
    data: {
      email: `journals-path-${suffix}@example.com`,
      password: "correct-horse-battery",
      displayName: "Journals path test",
    },
  });
  expect(signup.status()).toBe(201);

  const { profile, opportunity } = candidate!;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/journals/${encodeURIComponent(profile.id)}`);
  const card = page
    .locator("article")
    .filter({ hasText: opportunity.title })
    .first();
  const profileAxe = await new AxeBuilder({ page }).analyze();
  expect(
    profileAxe.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await expect(
    card.getByRole("button", { name: "Save to Tracker" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Save to Tracker" }).click();
  await expect(
    card.getByRole("button", { name: "Saved to Tracker" }),
  ).toBeVisible();

  await page.goto(`/opportunities/${encodeURIComponent(opportunity.id)}`);
  const opportunityAxe = await new AxeBuilder({ page }).analyze();
  expect(
    opportunityAxe.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await expect(page.getByRole("button", { name: "In Tracker" })).toBeVisible();

  await page.goto("/tracker");
  await expect(
    page.getByRole("heading", { name: opportunity.title, exact: true }),
  ).toBeVisible();
});

test("journals stay contained, accessible, and keyboard reachable at required viewports", async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 428, height: 926 },
    { width: 768, height: 844 },
    { width: 1280, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/journals", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Journals & small presses" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Missa home" }),
    ).toBeVisible();
    await expect(
      page.locator('section[aria-labelledby="journal-results-heading"]'),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBeTruthy();

    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    const interactiveSizes = await page
      .locator("a, button:not(#next-logo), input, select")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
      );
    expect(
      Math.min(
        ...interactiveSizes.map((size) => Math.min(size.width, size.height)),
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => Boolean(image.getAttribute("alt"))),
        ),
    ).toBeTruthy();
    await expect(page.locator("body")).not.toContainText(
      /freshness|profile checked|confidence/i,
    );
    await page.screenshot({
      path: testInfo.outputPath(
        `journals-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: false,
    });
  }

  await page.getByRole("textbox", { name: "Search" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#journal-kind")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Search" })).toBeFocused();
  expect(
    await page
      .locator('a[href^="/journals/"]')
      .first()
      .evaluate((element) => element.tabIndex),
  ).toBeGreaterThanOrEqual(0);
});

test("empty results announce a truthful recovery state", async ({ page }) => {
  await page.goto("/journals?q=definitely-no-profile-9f3d");
  await expect(page.locator('section[role="status"]')).toContainText(
    "No profiles match these filters",
  );
  await expect(
    page.getByRole("link", { name: "Clear search and filters" }),
  ).toBeVisible();
});
