import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const relational = process.env.MISSA_E2E_RELATIONAL === "1";
const relationalDatabaseUrl = process.env.DATABASE_URL?.trim() ?? "";

// Specs that require a seeded Postgres and relational authority. They are the
// only files whose assertions touch durable profile/tracker/following writes.
const relationalSpecs = [
  "**/first-save-focused-handoff.spec.ts",
  "**/discovery-relational.spec.ts",
  "**/profile.spec.ts",
  "**/profile-privacy.spec.ts",
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: relational ? relationalSpecs : undefined,
  testIgnore: relational ? undefined : relationalSpecs,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
    // Analytics consent is a one-time gate, so the suite starts already
    // answered and exercises the product. Specs that assert consent behaviour
    // override this with an empty storage state.
    storageState: "./e2e/storage-state.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        env: {
          DATABASE_URL: relational ? relationalDatabaseUrl : "",
          MISSA_SESSION_SECRET: "missa-e2e-session-secret",
          MISSA_DISABLE_AUTH_RATE_LIMIT: "1",
          MISSA_CREATOR_RELATIONAL_AUTHORITY: relational ? "1" : "0",
          MISSA_OPPORTUNITY_REPOSITORY: relational ? "postgres" : "engine",
          MISSA_OPPORTUNITY_CONTENT_READS: relational ? "1" : "engine",
        },
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
      },
});
