import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
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
          DATABASE_URL: "",
          MISSA_SESSION_SECRET: "missa-e2e-session-secret",
          // The suite provisions an account per test and drives deliberate bad
          // logins, all from one address. Only the two per-IP windows are
          // raised; every other limit stays at its shipped value, and
          // rate-limit.spec.ts asserts the limiter is still enforcing.
          MISSA_RATE_LIMIT_SIGNUP_IP: "100000",
          MISSA_RATE_LIMIT_LOGIN_IP: "100000",
        },
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
      },
});
