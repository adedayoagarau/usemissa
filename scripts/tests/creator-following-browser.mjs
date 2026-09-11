import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import fs from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import { chromium } from "playwright";
import { expect as baseExpect } from "@playwright/test";
import { createSessionToken } from "@missa/radar-engine";
import AxeBuilder from "@axe-core/playwright";
const expect = baseExpect.configure({ timeout: 20000 });
nextEnv.loadEnvConfig(
  fileURLToPath(new URL("../../apps/web/", import.meta.url)),
  true,
  { info() {}, error() {} },
);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  id = `following-ui-${randomUUID()}`,
  email = `${id}@example.invalid`,
  browser = await chromium.launch();
let page;
try {
  await pool.query(
    "insert into radar_accounts(id,email,data) values($1,$2,$3)",
    [id, email, JSON.stringify({ id, email, userId: id, active: true })],
  );
  await pool.query(
    "insert into notification_preferences(account_id) values($1)",
    [id],
  );
  const program = (
    await pool.query(
      `select p.id,p.name,e.organization_id from programs p join entities e on e.id=p.entity_id join radar_organizations r on r.id=e.organization_id where exists(select 1 from opportunities o where o.program_id=p.id and o.publication_state='published') order by p.id limit 1`,
    )
  ).rows[0];
  assert(program);
  const context = await browser.newContext({
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.addCookies([
    {
      name: "missa_session",
      value: createSessionToken(
        id,
        process.env.MISSA_SESSION_SECRET,
        new Date(),
      ),
      url: "http://localhost:3100",
    },
  ]);
  await page.goto("http://localhost:3100/following", { timeout: 90000 });
  await page
    .getByRole("heading", { name: "Which organizations are on your list?" })
    .waitFor();
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await page.getByLabel("Show", { exact: true }).selectOption("program");
  await page
    .getByLabel("Find an organization or program", { exact: true })
    .fill(program.name);
  await page
    .getByRole("button", { name: `Open ${program.name}`, exact: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Application rounds", exact: true })
    .waitFor();
  let fail = true;
  await page.route("**/api/me/following", async (route) => {
    if (route.request().method() === "POST" && fail) {
      fail = false;
      await route.fulfill({
        status: 503,
        json: { error: "Please retry this save." },
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Follow program", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "Please retry" }).waitFor();
  await page
    .getByRole("button", { name: "Follow program", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unfollow program", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unfollow program", exact: true }),
  ).toBeVisible();
  assert.equal(
    (
      await (
        await page.request.get("/api/me/following?kind=program&followed=1")
      ).json()
    ).total,
    1,
  );
  fs.mkdirSync("apps/web/outputs", { recursive: true });
  await page.screenshot({
    path: "apps/web/outputs/following-program-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "View organization", exact: true })
    .click();
  await page.getByRole("heading", { name: "Programs", exact: true }).waitFor();
  await expect(
    page.getByRole("link", { name: "Full profile", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Follow organization", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unfollow organization", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    axe.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    [],
  );
  await page.screenshot({
    path: "apps/web/outputs/following-organization-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await page.getByLabel("Show", { exact: true }).selectOption("program");
  await page
    .getByLabel("Find an organization or program", { exact: true })
    .fill(program.name);
  await page
    .getByRole("button", { name: `Open ${program.name}`, exact: true })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Unfollow program", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Follow program", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.equal(
    (
      await (
        await page.request.get("/api/me/following?kind=program&followed=1")
      ).json()
    ).total,
    0,
  );
  await page.setViewportSize({ width: 640, height: 700 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: catalogue search, distinct organization/program drawers, failed-save retry, follow/reload/unfollow, mobile, keyboard, zoom and accessibility.",
  );
} catch (e) {
  if (page) {
    await page
      .screenshot({
        path: "apps/web/outputs/following-test-failure.png",
        fullPage: true,
      })
      .catch(() => {});
    console.log((await page.locator("body").innerText()).slice(0, 4000));
  }
  throw e;
} finally {
  await browser.close();
  await pool.query(
    "delete from outbox_events where correlation_id in (select correlation_id from workspace_command_receipts where actor_account_id=$1) or correlation_id in (select correlation_id from audit_events where account_id=$1)",
    [id],
  );
  await pool.query("delete from audit_events where account_id=$1", [id]);
  await pool.query(
    "delete from workspace_command_receipts where actor_account_id=$1",
    [id],
  );
  await pool.query("delete from radar_accounts where id=$1", [id]);
  await pool.end();
}
