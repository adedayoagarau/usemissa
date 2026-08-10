import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function trackerAccount(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', {
    data: {
      email: `tracker-${suffix}@example.com`,
      password: 'correct-horse-battery',
      displayName: 'Tracker Test User',
    },
  });
  expect(signup.status()).toBe(201);

  const opportunities = await page.request.get('/api/opportunities?limit=1');
  expect(opportunities.ok()).toBeTruthy();
  const payload = await opportunities.json() as { items: Array<{ id: string; title: string }> };
  const opportunity = payload.items[0];
  expect(opportunity).toBeTruthy();
  const save = await page.request.post('/api/me/tracker', { data: { opportunityId: opportunity!.id } });
  expect([200, 201]).toContain(save.status());
  return opportunity!;
}

test('Tracker uses the selected next-actions composition and self-scoped mutations', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto('/tracker');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { level: 1, name: 'Tracker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Tracker views' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('header').getByRole('link', { name: 'Opportunities', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Tracker', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Submissions', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: opportunity.title, exact: true })).toBeVisible();
  await expect(page.getByText(/fit score|trust|freshness|acceptance rate|source confidence|\(\d+d\)/i)).toHaveCount(0);

  const status = page.getByLabel(`Update status for ${opportunity.title}`);
  await status.selectOption('preparing');
  await expect(page.getByRole('status')).toContainText(`${opportunity.title} is now Preparing.`);
  await expect(status).toHaveValue('preparing');
  await page.screenshot({ path: 'outputs/tracker-product-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await expect(page.getByRole('heading', { name: 'Upcoming and recorded deadlines' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});

test('Tracker keeps a real list fallback and accessibility at phone width', async ({ page }) => {
  await trackerAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tracker');

  await expect(page.getByRole('heading', { level: 1, name: 'Tracker' })).toBeVisible();
  await page.getByRole('button', { name: 'Stage board' }).click();
  await expect(page).toHaveURL(/layout=board/);
  await expect(page.getByRole('heading', { name: 'Saved', exact: true })).toBeVisible();
  await expect(page.getByLabel(/Update status for/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/tracker-product-mobile.png', fullPage: true });
});

test('Tracker status endpoint cannot mutate another account item', async ({ browser, baseURL }) => {
  const ownerContext = await browser.newContext({ baseURL });
  const otherContext = await browser.newContext({ baseURL });
  const ownerPage = await ownerContext.newPage();
  const otherPage = await otherContext.newPage();
  try {
    const opportunity = await trackerAccount(ownerPage);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const signup = await otherPage.request.post('/api/auth/signup', {
      data: {
        email: `tracker-other-${suffix}@example.com`,
        password: 'correct-horse-battery',
        displayName: 'Other Tracker User',
      },
    });
    expect(signup.status()).toBe(201);
    const response = await otherPage.request.post(`/api/me/tracker/${encodeURIComponent(opportunity.id)}/status`, {
      data: { status: 'accepted' },
    });
    expect(response.status()).toBe(404);
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});
