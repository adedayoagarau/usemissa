import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const registrations: Array<{
      tool: {
        name: string;
        execute: (
          input: Record<string, unknown>,
          options: { signal: AbortSignal },
        ) => Promise<unknown>;
      };
      aborted: boolean;
    }> = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(
          tool: (typeof registrations)[number]["tool"],
          options?: { signal?: AbortSignal },
        ) {
          const registration = { tool, aborted: false };
          registrations.push(registration);
          options?.signal?.addEventListener(
            "abort",
            () => {
              registration.aborted = true;
            },
            { once: true },
          );
        },
      },
    });
    Object.defineProperty(window, "__missaWebMcpRegistrations", {
      configurable: true,
      value: registrations,
    });
  });
});

test("public discovery registers bounded read-only WebMCP tools", async ({
  page,
}) => {
  await page.route("**/api/opportunities?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        total: 1,
        nextCursor: null,
        items: [
          {
            id: "opp_webmcp",
            title: "WebMCP test opportunity",
            type: "grant",
            status: "open",
            deadline: { kind: "rolling" },
            fee: { status: "no-fee" },
            source: {
              kind: "organization-website",
              name: "Test source",
              url: "https://example.com/opportunity",
            },
            submissionAvailable: true,
          },
        ],
      }),
    });
  });
  const response = await page.goto("/opportunities");
  expect(response?.headers()["permissions-policy"]).toContain("tools=(self)");

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            __missaWebMcpRegistrations: Array<{
              tool: { name: string };
              aborted: boolean;
            }>;
          }
        ).__missaWebMcpRegistrations
          .filter((registration) => !registration.aborted)
          .map((registration) => registration.tool.name),
      ),
    )
    .toEqual([
      "missa.get_surface_context",
      "missa.search_opportunities",
      "missa.get_opportunity",
      "missa.list_magazine_rankings",
      "missa.list_residency_rankings",
      "missa.get_public_creator_profile",
    ]);

  const result = await page.evaluate(async () => {
    const registrations = (
      window as typeof window & {
        __missaWebMcpRegistrations: Array<{
          tool: {
            name: string;
            execute: (
              input: Record<string, unknown>,
              options: { signal: AbortSignal },
            ) => Promise<unknown>;
          };
          aborted: boolean;
        }>;
      }
    ).__missaWebMcpRegistrations;
    const tool = registrations.find(
      (registration) =>
        !registration.aborted &&
        registration.tool.name === "missa.search_opportunities",
    )?.tool;
    if (!tool) throw new Error("Search tool was not registered");
    return tool.execute(
      { query: "test", limit: 1 },
      { signal: new AbortController().signal },
    );
  });
  expect(result).toMatchObject({
    total: 1,
    authority_effect: "none",
    provider_confirmation: false,
    items: [{ id: "opp_webmcp", title: "WebMCP test opportunity" }],
  });
});

test("sensitive routes register no WebMCP tools", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.headers()["permissions-policy"]).toContain("tools=()");
  await page.waitForTimeout(100);
  const registrations = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __missaWebMcpRegistrations: unknown[];
        }
      ).__missaWebMcpRegistrations.length,
  );
  expect(registrations).toBe(0);
});
