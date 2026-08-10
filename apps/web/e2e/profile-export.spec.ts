import { expect, test, type Page } from '@playwright/test';

async function createAccount(page: Page, name = 'Export Test User') {
  const email = `export-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: name } });
  expect(signup.status()).toBe(201);
  const owner = await page.request.get('/api/me/profile');
  expect(owner.ok()).toBeTruthy();
  return (await owner.json()) as { id: string };
}

async function trackFirstOpportunity(page: Page, userId: string) {
  const opportunities = await page.request.get('/api/opportunities');
  expect(opportunities.ok()).toBeTruthy();
  const item = ((await opportunities.json()) as { items: Array<{ id: string }> }).items[0];
  expect(item?.id).toBeTruthy();
  const tracked = await page.request.post(`/api/users/${userId}/track`, { data: { opportunityId: item.id } });
  expect(tracked.status()).toBe(201);
}

test('profile data export downloads tracker JSON and enforces an account cooldown', async ({ page }) => {
  const profile = await createAccount(page);
  await trackFirstOpportunity(page, profile.id);
  await page.goto('/profile?section=data');
  await expect(page.getByRole('heading', { name: 'Data', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
  await expect(page.getByText(/Works, Files, and Saved Answers/)).toBeVisible();

  const json = await page.request.get('/api/me/export?format=json&scope=tracker');
  expect(json.status()).toBe(200);
  expect(json.headers()['content-type']).toContain('application/json');
  expect(json.headers()['content-disposition']).toContain('missa-tracker-');
  expect(json.headers()['cache-control']).toBe('private, no-store');
  const body = await json.json();
  expect(body.exportVersion).toBe(1);
  expect(body.included).toEqual(['tracker']);
  expect(body.omitted).toEqual([]);
  expect(body.tracker).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain('correct-horse-battery');

  const cooldown = await page.request.get('/api/me/export?format=json');
  expect(cooldown.status()).toBe(429);
  expect(cooldown.headers()['retry-after']).toBe('60');
  expect((await cooldown.json()).error).toContain('cooldown');
});

test('export route includes private library scope', async ({ page }) => {
  const profile = await createAccount(page, 'CSV Export User');
  await trackFirstOpportunity(page, profile.id);

  const createdWork = await page.request.post('/api/me/library/works', { data: { title: 'Night River' } });
  expect(createdWork.status()).toBe(201);
  const library = await page.request.get('/api/me/export?format=json&scope=library');
  expect(library.status()).toBe(200);
  expect((await library.json()).works[0].title).toBe('Night River');

  const cooldown = await page.request.get('/api/me/export?format=csv');
  expect(cooldown.status()).toBe(429);
});

test('export is session-owned and rejects unauthenticated or user-selected scope', async ({ page }) => {
  const first = await createAccount(page, 'First Export User');
  await trackFirstOpportunity(page, first.id);
  await page.request.post('/api/auth/logout');

  const unauthenticated = await page.request.get('/api/me/export');
  expect(unauthenticated.status()).toBe(401);

  const second = await createAccount(page, 'Second Export User');
  const own = await page.request.get('/api/me/export?format=json');
  expect(own.status()).toBe(200);
  const ownBody = await own.json();
  expect(ownBody.tracker).toEqual([]);
  const selected = await page.request.get(`/api/me/export?userId=${encodeURIComponent(first.id)}`);
  expect(selected.status()).toBe(400);
  expect(second.id).not.toBe(first.id);
});
