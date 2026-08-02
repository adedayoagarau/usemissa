import { expect, test, type Page } from '@playwright/test';

async function createAccount(page: Page, name = 'Profile Test User') {
  const email = `profile-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: name } });
  expect(signup.status()).toBe(201);
  const owner = await page.request.get('/api/me/profile');
  expect(owner.ok()).toBeTruthy();
  return { email, profile: (await owner.json()) as { id: string; publicUrl: string } };
}

test('owner can complete a profile and visitors only see the public projection', async ({ page }) => {
  const { email, profile } = await createAccount(page);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await page.getByLabel('Display name').fill('  Rowan Example  ');
  await page.getByLabel('Short bio').fill('A writer working across poetry and criticism.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Profile saved');

  const saved = await page.request.get('/api/me/profile');
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json();
  expect(savedBody.displayName).toBe('Rowan Example');
  expect(savedBody.bio).toBe('A writer working across poetry and criticism.');
  expect(savedBody.completeness.complete).toBe(true);

  const publicResponse = await page.request.get(`/api/profile/${profile.id}`);
  expect(publicResponse.ok()).toBeTruthy();
  expect(publicResponse.headers()['cache-control']).toBe('no-store');
  const publicBody = await publicResponse.json();
  expect(publicBody).toEqual({ id: profile.id, displayName: 'Rowan Example', bio: 'A writer working across poetry and criticism.' });
  expect(JSON.stringify(publicBody)).not.toContain(email);
  expect(publicBody).not.toHaveProperty('attributes');
  expect(publicBody).not.toHaveProperty('genres');

  await page.request.post('/api/auth/logout');
  await page.goto(`/profile/${profile.id}`);
  await expect(page.getByRole('heading', { name: 'Rowan Example' })).toBeVisible();
  await expect(page.getByText('A writer working across poetry and criticism.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(email);
  await expect(page.getByRole('link', { name: 'Browse opportunities' }).first()).toBeVisible();
});

test('profile validation preserves recovery and owner route redirects without a session', async ({ page }) => {
  const { profile } = await createAccount(page);
  await page.goto('/profile');
  await page.getByLabel('Display name').fill('');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Display name must be between 1 and 120 characters.');

  await page.getByLabel('Display name').fill('Still here');
  await page.getByLabel('Short bio').fill('x'.repeat(1001));
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Bio must be 1,000 characters or fewer.');

  const ownerAfterInvalid = await page.request.get('/api/me/profile');
  const ownerBody = await ownerAfterInvalid.json();
  expect(ownerBody.displayName).toBe('Profile Test User');
  expect(ownerBody.bio).toBeUndefined();

  await page.request.post('/api/auth/logout');
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  expect(profile.id).toMatch(/^user_/);
});

test.describe('mobile profile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('stays within the viewport and keeps form controls reachable', async ({ page }) => {
    await createAccount(page, 'Mobile Profile User');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const inputBox = await page.getByLabel('Display name').boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  });
});
