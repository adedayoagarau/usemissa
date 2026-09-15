import { expect, test } from '@playwright/test';

const routes = [
  {
    path: '/admin/organizations',
    heading: 'Organizations',
    listName: 'Platform organization workflow snapshot',
    emptyCopy: 'No organizations match the current filters.',
  },
  {
    path: '/admin/billing',
    heading: 'Billing ledger',
    listName: 'Durable billing provider event ledger',
    emptyCopy: 'No provider ledger entries observed.',
  },
  {
    path: '/admin/radar',
    heading: 'Opportunities',
    listName: 'Source health with attempt, fetch, process, and freshness distinctions',
    emptyCopy: 'No source records in the current store',
  },
] as const;

test('admin data tables adapt to labelled records without mobile overflow', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { email: 'admin@missa.dev', password: 'radar-admin-seed' },
  });
  expect(login.status()).toBe(200);

  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `${route.path} overflows at 390px`,
    ).toBeTruthy();

    const mobileList = page.getByRole('list', { name: route.listName });
    if (await mobileList.count()) {
      await expect(mobileList).toBeVisible();
      await expect(page.getByRole('table', { name: route.listName })).toBeHidden();
    } else {
      await expect(page.getByText(route.emptyCopy, { exact: false })).toBeVisible();
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route.path);
    const desktopTable = page.getByRole('table', { name: route.listName });
    if (await desktopTable.count()) {
      await expect(desktopTable).toBeVisible();
      await expect(page.getByRole('list', { name: route.listName })).toBeHidden();
    }
  }
});
