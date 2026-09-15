import { expect, test, type APIRequestContext } from "@playwright/test";

test.skip(
  process.env.JOURNALS_E2E_REAL_DATA !== "1",
  "This regression requires an explicitly enabled real profile repository.",
);

type ProfileSummary = {
  id: string;
  slug: string;
};

type ProfileOpportunity = {
  id: string;
};

async function profileOpportunities(
  request: APIRequestContext,
  profileId: string,
): Promise<ProfileOpportunity[]> {
  const response = await request.get(
    `/api/journals/${encodeURIComponent(profileId)}`,
  );
  if (!response.ok()) return [];
  const profile = (await response.json()) as {
    opportunities?: ProfileOpportunity[];
  };
  return profile.opportunities ?? [];
}

test("journal pages render one listing per canonical opportunity identity", async ({
  page,
  request,
}) => {
  const directoryResponse = await request.get(
    "/api/journals?kind=literary_magazine&limit=100",
  );
  expect(directoryResponse.ok()).toBeTruthy();
  const directory = (await directoryResponse.json()) as {
    items: ProfileSummary[];
  };

  let duplicateProfile:
    | { profile: ProfileSummary; uniqueOpportunityCount: number }
    | undefined;
  for (const profile of directory.items) {
    const opportunities = await profileOpportunities(request, profile.id);
    const uniqueIds = new Set(opportunities.map((item) => item.id));
    if (opportunities.length > uniqueIds.size) {
      duplicateProfile = {
        profile,
        uniqueOpportunityCount: uniqueIds.size,
      };
      break;
    }
  }

  expect(duplicateProfile).toBeDefined();
  await page.goto(`/journal/${encodeURIComponent(duplicateProfile!.profile.slug)}`);
  await expect(page.locator("#profile-opportunities h3")).toHaveCount(
    duplicateProfile!.uniqueOpportunityCount,
  );
});
