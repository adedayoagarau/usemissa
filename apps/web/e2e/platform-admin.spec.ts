import { expect, test } from "@playwright/test";
import AxeBuilder from '@axe-core/playwright';

test("admin System keeps Profile migration dependencies visible when unavailable", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "admin@missa.dev", password: "radar-admin-seed" },
  });
  expect(login.status()).toBe(200);

  await page.goto("/admin/system");

  await expect(
    page.getByRole("heading", { name: "Profile and durable tables" }),
  ).toBeVisible();
  for (const table of [
    "handles",
    "handle_aliases",
    "profile_issue_reports",
    "account_deletion_requests",
  ]) {
    await expect(page.getByText(table, { exact: true })).toBeVisible();
  }
});

test("admin can open the control room and operational loop", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "admin@missa.dev", password: "radar-admin-seed" },
  });
  expect(login.status()).toBe(200);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Control Room" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Operations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CRM", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Billing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Organizations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Content", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Analytics", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Messaging", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Support", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Agents", exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Operate', { exact: true })).toBeVisible();
  await expect(page.getByText('Review', { exact: true })).toBeVisible();
  await expect(page.getByText('Serve', { exact: true })).toBeVisible();
  await expect(page.getByText('Business', { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Governance", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/customers");
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search customers" }),
  ).toBeVisible();

  await page.goto("/admin/content");
  await expect(
    page.getByRole("heading", { name: "Content", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search content registry" }),
  ).toBeVisible();

  await page.goto("/admin/analytics");
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/organizations");
  await expect(
    page.getByRole("heading", { name: "Organizations", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search organizations" }),
  ).toBeVisible();

  await page.goto("/admin/crm");
  await expect(
    page.getByRole("heading", { name: "CRM timeline", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Add internal note", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/billing");
  await expect(
    page.getByRole("heading", { name: "Billing ledger", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/agents");
  await expect(
    page.getByRole("heading", { name: "Agent controls", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Request a control", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/messaging");
  await expect(
    page.getByRole("heading", { name: "Messaging & delivery", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/governance");
  await expect(
    page.getByRole("heading", { name: "Governance", exact: true }),
  ).toBeVisible();

  await page.goto('/admin/taxonomy');
  await expect(page.getByRole('heading', { name: 'Taxonomy', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Platform admin navigation' })).toBeVisible();

  await page.goto("/admin/support");
  await expect(
    page.getByRole("heading", { name: "Support cases", exact: true }),
  ).toBeVisible();

  await page.goto("/admin/operations");
  await expect(
    page.getByRole("heading", { name: "Operations queue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run bounded tick" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Worklist" })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search operations queue" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  const controlRoomAccessibility = await new AxeBuilder({ page }).analyze();
  expect(controlRoomAccessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/platform-admin-control-room-mobile.png', fullPage: true });

  await page.goto('/admin/operations');
  const firstQueueRow = page.locator('[data-queue-row]').first();
  if (await firstQueueRow.count()) {
    await firstQueueRow.click();
    await expect(page.getByRole('button', { name: 'Back to worklist' })).toBeVisible();
    await expect(page).toHaveURL(/item=/u);
    await expect(page.getByRole('heading', { name: 'Worklist' })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: 'outputs/platform-admin-evidence-detail-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Back to worklist' }).click();
    await expect(page.getByRole('heading', { name: 'Worklist' })).toBeVisible();
    await expect(page).not.toHaveURL(/item=/u);
  }

  for (const width of [375, 428, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
    for (const route of [
      "/admin",
      "/admin/operations",
      "/admin/radar",
      "/admin/support",
      "/admin/crm",
      "/admin/agents",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${route} overflows at ${width}px`,
      ).toBeTruthy();
    }
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Control Room" }),
    ).toBeVisible();
    if (width < 1024)
      await expect(
        page.getByRole("button", { name: "Open platform admin navigation" }),
      ).toBeVisible();
  }
});
