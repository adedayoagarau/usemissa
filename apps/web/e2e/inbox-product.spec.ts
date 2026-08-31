import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

let adaSessionCookie = '';
let adaOrigin = '';

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(response.ok()).toBeTruthy();
  adaSessionCookie = response.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1] ?? '';
  adaOrigin = new URL(response.url()).origin;
  expect(adaSessionCookie).toBeTruthy();
});

async function loginAsAda(page: import('@playwright/test').Page) {
  await page.context().addCookies([{ name: 'missa_session', value: adaSessionCookie, url: adaOrigin, httpOnly: true, sameSite: 'Lax' }]);
  await page.goto('/inbox');
  const profile = await page.evaluate(async () => {
    const result = await fetch('/api/me/profile', { cache: 'no-store' });
    return { ok: result.ok, status: result.status, body: await result.json() as { id?: string } };
  });
  expect(profile.ok, `Profile request failed with ${profile.status}`).toBeTruthy();
  expect(profile.body.id).toBeTruthy();
  return profile.body as { id: string };
}

test('Option 2 Inbox groups real owner alerts and persists read state', async ({ page }) => {
  const session = await loginAsAda(page);
  await page.goto('/inbox');

  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Your Missa briefing', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Inbox views' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Briefing/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText(/source confidence|prediction confidence|matched confidence|classification|recently updated/i)).toHaveCount(0);

  const inbox = await page.evaluate(async (userId) => {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/inbox`, { cache: 'no-store' });
    return { ok: response.ok, status: response.status, body: await response.json() as { newForYou?: Array<{ id: string; revision: number }> } };
  }, session.id);
  expect(inbox.ok, `Inbox request failed with ${inbox.status}`).toBeTruthy();
  const body = inbox.body;
  const first = body.newForYou?.[0];
  expect(first).toBeTruthy();
  const read = await page.evaluate(async (item) => {
    const response = await fetch('/api/me/inbox/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ ids: [item.id], items: [item] }),
    });
    return { ok: response.ok, status: response.status, body: await response.json() as { updated?: number } };
  }, first!);
  expect(read.ok, `Inbox read request failed with ${read.status}`).toBeTruthy();
  expect(read.body).toMatchObject({ updated: 1 });

  await page.screenshot({ path: 'outputs/inbox-option-02-desktop.png', fullPage: true });
});

test('Email review uses customer language and confirms only after a decision', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAda(page);
  await page.goto('/inbox?view=email');
  await expect(page.getByRole('heading', { name: 'Email review' })).toBeVisible();
  await expect(page.getByText(/possible confidence|ambiguous|classification|internal matcher reason/i)).toHaveCount(0);
  await page.getByRole('button', { name: /Your submission is now in review/ }).click();
  await expect(page.getByRole('button', { name: 'Back to email updates' })).toBeVisible();
  await expect(page.getByLabel('Related Tracker record')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: 'outputs/inbox-option-02-email-review-mobile.png', fullPage: true });
  await page.getByLabel('Related Tracker record').selectOption('opp_story-16-2-e2e');
  await page.getByRole('button', { name: 'Confirm update' }).click();
  await expect(page.getByText('Tracker update confirmed.', { exact: true })).toBeVisible();
  const reviewed = await page.request.get('/api/me/email-candidates?state=all');
  expect(reviewed.ok()).toBeTruthy();
  const reviewedBody = await reviewed.json() as { candidates: Array<{ id: string; state: string }> };
  expect(reviewedBody.candidates).toContainEqual(expect.objectContaining({ id: 'story-16-2-e2e-email-candidate', state: 'confirmed' }));
});

test('Inbox stays usable at phone width and preserves the authenticated return path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAda(page);
  await page.goto('/inbox');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/inbox-option-02-mobile.png', fullPage: true });

  await page.request.post('/api/auth/logout');
  await page.goto('/inbox?view=email');
  await expect(page).toHaveURL(/\/login\?next=%2Finbox%3Fview%3Demail$/);
});

test('Notification preferences save through the relational UI and survive reload', async ({ page }) => {
  await loginAsAda(page);
  const currentResponse = await page.request.get('/api/me/notification-preferences');
  expect(currentResponse.ok()).toBeTruthy();
  const current = await currentResponse.json() as {
    revision: number;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    savedSearchEnabled: boolean;
    followEnabled: boolean;
    reminderEnabled: boolean;
  };
  const reset = await page.request.put('/api/me/notification-preferences', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: {
      inAppEnabled: current.inAppEnabled,
      emailEnabled: false,
      digestCadence: 'off',
      savedSearchEnabled: current.savedSearchEnabled,
      followEnabled: current.followEnabled,
      reminderEnabled: current.reminderEnabled,
      expectedRevision: current.revision,
    },
  });
  expect(reset.ok()).toBeTruthy();

  await page.goto('/inbox');
  const email = page.getByRole('checkbox', { name: 'Email delivery' });
  await expect(email).not.toBeChecked();
  await email.check();
  await page.getByLabel('Email digest cadence').selectOption('weekly');
  await page.getByRole('button', { name: 'Save notification preferences' }).click();
  await expect(page.getByRole('region', { name: 'Notification preferences' }).getByRole('status')).toContainText('Notification preferences saved.');
  await expect(page.getByText(/delivery provider is currently unavailable/i)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Email delivery' })).toBeChecked();
  await expect(page.getByLabel('Email digest cadence')).toHaveValue('weekly');
});
