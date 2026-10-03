import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function trackerAccount(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', {
    data: {
      email: `tracker-${suffix}@example.com`,
      password: 'correct-horse-battery',
      givenName: 'Tracker', familyName: 'Tester',
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

test('Tracker deep links open the linked item in Saved and then Submissions', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = await page.goto(`/tracker?view=saved&application=${encodeURIComponent(opportunity.id)}`);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('link', { name: 'Tracker', exact: true }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1, name: 'Tracker' })).toBeVisible();
  const views = page.getByRole('navigation', { name: 'Tracker views' });
  await expect(views.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-current', 'page');
  const selected = page.locator('article[data-selected="true"]');
  await expect(selected.getByRole('heading', { name: opportunity.title, exact: true })).toBeVisible();
  await expect(selected).toBeFocused();
  await expect(page.getByText(/fit score|trust|freshness|acceptance rate|source confidence|\(\d+d\)/i)).toHaveCount(0);

  const statusSaved = page.waitForResponse((candidate) => candidate.url().includes('/status') && candidate.request().method() === 'POST');
  await selected.getByLabel(`Update status for ${opportunity.title}`).selectOption('submitted');
  expect((await statusSaved).ok()).toBeTruthy();

  await page.goto(`/tracker?view=awaiting&application=${encodeURIComponent(opportunity.id)}`);
  await expect(views.getByRole('button', { name: 'Submissions', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('article[data-selected="true"]').getByRole('heading', { name: opportunity.title, exact: true })).toBeVisible();

  // A reminder for a saved item that has since been submitted still lands on it.
  await page.goto(`/tracker?view=saved&application=${encodeURIComponent(opportunity.id)}`);
  await expect(views.getByRole('button', { name: 'Submissions', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('article[data-selected="true"]')).toHaveCount(1);
  await page.screenshot({ path: 'outputs/tracker-product-desktop.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});

test('Tracker Saved view remains accessible at phone width', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tracker?view=saved');

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Tracker', exact: true }).last()).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { level: 1, name: 'Tracker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Tracker views' }).getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Saved and preparing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: opportunity.title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/tracker-product-mobile.png', fullPage: true });
});

test('Tracker explains a deep link to an item that is no longer tracked', async ({ page }) => {
  await trackerAccount(page);
  await page.goto('/tracker?view=saved&application=not-in-this-tracker');
  await expect(page.getByRole('heading', { name: 'This item is no longer in your Tracker' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Tracker views' }).getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('heading', { name: 'This item is no longer in your Tracker' })).toHaveCount(0);
  await expect(page).not.toHaveURL(/application=/);
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
        givenName: 'Other', familyName: 'Tracker',
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

test('Tracker exposes a stale-edit recovery error', async ({ page }) => {
  const opportunity = await trackerAccount(page);
  await page.route(`**/api/me/tracker/${encodeURIComponent(opportunity.id)}/status`, async (route) => {
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'conflict' }) });
  });
  await page.goto(`/tracker?view=saved&application=${encodeURIComponent(opportunity.id)}`);
  await page.getByLabel(`Update status for ${opportunity.title}`).selectOption('submitted');
  await expect(page.locator('article[data-selected="true"]').getByRole('alert')).toContainText('changed in another session');
  await expect(page.getByRole('button', { name: 'Reload latest Tracker state' })).toBeVisible();
});
