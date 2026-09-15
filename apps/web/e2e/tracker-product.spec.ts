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
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{
    name: 'missa_session',
    value: sessionCookie!,
    url: new URL(signup.url()).origin,
    httpOnly: true,
    sameSite: 'Lax',
  }]);

  const opportunities = await page.request.get('/api/opportunities?limit=1');
  expect(opportunities.ok()).toBeTruthy();
  const payload = await opportunities.json() as { items: Array<{ id: string; title: string }> };
  const opportunity = payload.items[0];
  expect(opportunity).toBeTruthy();
  const save = await page.request.post('/api/me/tracker', { data: { opportunityId: opportunity!.id } });
  expect([200, 201]).toContain(save.status());
  return opportunity!;
}

test('My applications records submission progress with self-scoped mutations', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto('/tracker');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('link', { name: 'Tracker', exact: true }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1, name: 'My applications' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: opportunity.title, exact: true })).toBeVisible();
  await expect(page.getByText(/fit score|trust|freshness|acceptance rate|source confidence|\(\d+d\)/i)).toHaveCount(0);

  await page.getByRole('button', { name: new RegExp(opportunity.title) }).click();
  await page.getByRole('button', { name: 'Record submission' }).click();
  await page.getByLabel('What happened?').selectOption('submitted');
  await page.getByRole('button', { name: 'Save update' }).click();
  await expect(page.getByRole('tab', { name: /Awaiting responses/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Selected application').getByText('Submitted', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'outputs/tracker-product-desktop.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});

test('My applications remains accessible at phone width', async ({ page }) => {
  await trackerAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tracker');

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Tracker', exact: true }).last()).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1, name: 'My applications' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('region', { name: 'Application list' })).toBeVisible();
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
    const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
    expect(sessionCookie).toBeTruthy();
    await otherPage.context().addCookies([{
      name: 'missa_session',
      value: sessionCookie!,
      url: new URL(signup.url()).origin,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    const response = await otherPage.request.post(`/api/me/tracker/${encodeURIComponent(opportunity.id)}/status`, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      data: { status: 'accepted', expectedRevision: 1 },
    });
    expect(response.status()).toBe(404);
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});

test('My applications exposes a stale-edit recovery error', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.route(`**/api/me/applications/${encodeURIComponent(opportunity.id)}`, async (route) => {
    if (route.request().method() === 'GET') return route.continue();
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'This application changed in another session.' }) });
  });
  await page.goto('/tracker');
  await page.getByRole('button', { name: new RegExp(opportunity.title) }).click();
  await page.getByRole('button', { name: 'Record submission' }).click();
  await page.getByRole('button', { name: 'Save update' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('changed in another session');
});
