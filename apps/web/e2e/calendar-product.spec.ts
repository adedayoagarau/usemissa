import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', { data: { email: `calendar-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Calendar User' } });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
  await page.route('**/api/me/calendar/connections', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ connections: [], availability: { google: false, microsoft: false } }),
  }));
  await page.route('**/api/users/*/calendar-token', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ state: { active: false, revision: 1 } }),
  }));
  await page.route('**/api/me/calendar/events?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      events: [{ id: 'event-one', title: 'Draft application', startAt: '2026-08-30T09:00:00.000Z', endAt: '2026-08-30T10:00:00.000Z', allDay: false, color: 'ink', revision: 1 }],
      tracker: [{ opportunityId: 'opp-one', title: 'Autumn Prize', organizationName: 'Example Review', deadline: '2026-09-15' }],
    }),
  }));
});

test('Calendar is editable, keyboard reachable, contained, and truthful about provider availability', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { level: 1, name: 'Your working calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google · Not configured' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Outlook · Not configured' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Connect local calendar' })).toBeVisible();
  await page.getByRole('button', { name: 'Add event' }).click();
  await expect(page.getByRole('heading', { name: 'Add event' })).toBeVisible();
  await expect(page.getByLabel('Title')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add event' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add event' })).toBeFocused();
  await expect(page.locator('section[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Calendar keeps the signed-out return path', async ({ page }) => {
  await page.request.post('/api/auth/logout');
  await page.goto('/calendar');
  await expect(page).toHaveURL(/\/login\?next=%2Fcalendar$/);
});

test('Calendar feed issue, rotation, and revocation invalidate prior private links', async ({ page }) => {
  await page.unroute('**/api/users/*/calendar-token');
  const profileResponse = await page.request.get('/api/me/profile');
  expect(profileResponse.ok()).toBeTruthy();
  const profile = await profileResponse.json() as { id: string };
  expect(profile.id).toBeTruthy();
  const endpoint = `/api/users/${encodeURIComponent(profile.id)}/calendar-token`;

  const initialResponse = await page.request.get(endpoint);
  expect(initialResponse.ok()).toBeTruthy();
  const initial = await initialResponse.json() as { state: { active: boolean; revision: number } };
  if (initial.state.active) {
    const reset = await page.request.delete(endpoint, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      data: { expectedRevision: initial.state.revision },
    });
    expect(reset.ok()).toBeTruthy();
  }

  const issue = await page.request.post(endpoint, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { action: 'issue' },
  });
  expect(issue.status()).toBe(201);
  const issued = await issue.json() as { token: string; state: { active: boolean; revision: number } };
  expect(issued.state.active).toBeTruthy();
  const firstFeed = await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/calendar.ics?token=${encodeURIComponent(issued.token)}`);
  expect(firstFeed.status()).toBe(200);
  expect(firstFeed.headers()['cache-control']).toContain('private, no-store');
  expect(firstFeed.headers()['content-type']).toContain('text/calendar');

  const rotate = await page.request.post(endpoint, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { action: 'rotate', expectedRevision: issued.state.revision },
  });
  expect(rotate.ok()).toBeTruthy();
  const rotated = await rotate.json() as { token: string; state: { active: boolean; revision: number } };
  expect(rotated.token).not.toBe(issued.token);
  expect((await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/calendar.ics?token=${encodeURIComponent(issued.token)}`)).status()).toBe(401);
  expect((await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/calendar.ics?token=${encodeURIComponent(rotated.token)}`)).status()).toBe(200);

  const revoke = await page.request.delete(endpoint, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { expectedRevision: rotated.state.revision },
  });
  expect(revoke.ok()).toBeTruthy();
  expect((await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/calendar.ics?token=${encodeURIComponent(rotated.token)}`)).status()).toBe(401);
  await page.goto('/calendar');
  await expect(page.getByRole('button', { name: 'Connect local calendar' })).toBeVisible();
});

test('Calendar creates and deletes a personal event through the relational UI', async ({ page }) => {
  await page.unroute('**/api/me/calendar/events?**');
  const title = `Delete proof ${Date.now()}`;
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Add event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page.getByText('Event added.', { exact: true })).toBeAttached();
  const event = page.getByRole('button', { name: new RegExp(title) }).first();
  await expect(event).toBeVisible();
  await event.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Event deleted.', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: new RegExp(title) })).toHaveCount(0);
});
