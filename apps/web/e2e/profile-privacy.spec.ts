import { expect, test, type Page } from '@playwright/test';

async function createAccount(page: Page) {
  const email = `privacy-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'correct-horse-battery';
  const signup = await page.request.post('/api/auth/signup', {
    data: { email, password, givenName: 'Privacy', familyName: 'Test User' },
  });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
  const owner = await page.request.get('/api/me/profile');
  expect(owner.ok()).toBeTruthy();
  const profile = await owner.json() as { id: string };
  return { email, password, id: profile.id };
}

test('owner can save privacy settings and public profile honors them', async ({ page }) => {
  const { email, password, id } = await createAccount(page);
  // The old Privacy link lands on Public profile, where visibility sits beside each field.
  await page.goto('/profile?section=privacy');
  await expect(page.getByRole('heading', { level: 2, name: 'Public profile' })).toBeVisible();
  const bioVisibility = page.getByRole('radiogroup', { name: 'Who can see your bio' });
  await expect(bioVisibility.getByRole('radio', { name: 'Public' })).toBeChecked();

  await bioVisibility.getByRole('radio', { name: 'Public' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(bioVisibility.getByRole('radio', { name: 'Only you' })).toBeChecked();
  await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('p[role="status"]')).toHaveText('Saved. Your public profile is up to date.');

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

  const login = await page.request.post('/api/auth/login', { data: { email, password } });
  const loginCookie = login.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(loginCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: loginCookie!, url: new URL(login.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
  const malformed = await page.request.patch('/api/me/profile/privacy', { data: { unknown: 'public' } });
  expect(malformed.status()).toBe(400);
  const afterMalformed = await page.request.get('/api/me/profile/privacy');
  expect((await afterMalformed.json()).settings.bio).toBe('private');
});

test('private display name has no identifying fallback on the public page', async ({ page }) => {
  const { email, id } = await createAccount(page);
  const current = await page.request.get('/api/me/profile/privacy');
  const revision = (await current.json() as { revision: number }).revision;
  const update = await page.request.patch('/api/me/profile/privacy', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { displayName: 'private', expectedRevision: revision },
  });
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

  test('visibility choices remain keyboard reachable without horizontal overflow', async ({ page }) => {
    await createAccount(page);
    await page.goto('/profile?section=privacy');
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(page.getByRole('radiogroup')).toHaveCount(2);
    const nameVisibility = page.getByRole('radiogroup', { name: 'Who can see your name' });
    await nameVisibility.getByRole('radio', { name: 'Public' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(nameVisibility.getByRole('radio', { name: 'Only you' })).toBeFocused();
    await expect(nameVisibility.getByRole('radio', { name: 'Only you' })).toBeChecked();
  });
});
