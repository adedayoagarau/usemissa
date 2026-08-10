import { expect, test, type Page } from '@playwright/test';

async function createAccount(page: Page) {
  const email = `privacy-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'correct-horse-battery';
  const signup = await page.request.post('/api/auth/signup', { data: { email, password, displayName: 'Privacy Test User' } });
  expect(signup.status()).toBe(201);
  const owner = await page.request.get('/api/me/profile');
  expect(owner.ok()).toBeTruthy();
  const profile = await owner.json() as { id: string };
  return { email, password, id: profile.id };
}

test('owner can save privacy settings and public profile honors them', async ({ page }) => {
  const { email, password, id } = await createAccount(page);
  await page.goto('/profile?section=privacy');
  await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible();
  await expect(page.getByText('Public', { exact: true }).first()).toBeVisible();

  const bioSwitch = page.getByRole('switch', { name: 'Make short bio private' });
  await bioSwitch.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Private', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save privacy settings' }).click();
  await expect(page.locator('p[role="status"]')).toHaveText('Privacy settings saved');

  const persisted = await page.request.get('/api/me/profile/privacy');
  expect(persisted.ok()).toBeTruthy();
  expect((await persisted.json()).settings).toEqual({ displayName: 'public', bio: 'private', trackedOpportunityCount: 'private' });

  await page.request.post('/api/auth/logout');
  const publicResponse = await page.request.get(`/api/profile/${id}`);
  expect(publicResponse.ok()).toBeTruthy();
  const publicBody = await publicResponse.json();
  expect(publicBody).toEqual({ id, displayName: 'Privacy Test User' });
  expect(JSON.stringify(publicBody)).not.toContain(email);
  await page.goto(`/profile/${id}`);
  await expect(page.getByRole('heading', { name: 'Privacy Test User' })).toBeVisible();
  await expect(page.locator('main').getByText('About', { exact: true })).toHaveCount(0);
  await expect(page.getByText('opportunities tracked', { exact: true })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(email);

  await page.request.post('/api/auth/login', { data: { email, password } });
  const malformed = await page.request.patch('/api/me/profile/privacy', { data: { unknown: 'public' } });
  expect(malformed.status()).toBe(400);
  const afterMalformed = await page.request.get('/api/me/profile/privacy');
  expect((await afterMalformed.json()).settings.bio).toBe('private');
});

test('private display name has no identifying fallback on the public page', async ({ page }) => {
  const { email, id } = await createAccount(page);
  const update = await page.request.patch('/api/me/profile/privacy', { data: { displayName: 'private' } });
  expect(update.ok()).toBeTruthy();
  await page.request.post('/api/auth/logout');

  const publicResponse = await page.request.get(`/api/profile/${id}`);
  expect(publicResponse.status()).toBe(200);
  expect(await publicResponse.json()).toEqual({ isPrivate: true });
  await page.goto(`/profile/${id}`);
  await expect(page.getByRole('heading', { name: 'This Profile is private.' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Privacy Test User');
  await expect(page.locator('body')).not.toContainText(email);
  await expect(page.locator('body')).not.toContainText(id);
});

test.describe('mobile privacy controls', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('privacy switches remain keyboard reachable without horizontal overflow', async ({ page }) => {
    await createAccount(page);
    await page.goto('/profile?section=privacy');
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(2);
    await switches.first().focus();
    await page.keyboard.press('Space');
    await expect(switches.first()).toBeFocused();
  });
});
