import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function createAccount(page: Page, name = 'Profile Test User') {
  const email = `profile-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const signup = await page.request.post('/api/auth/signup', { data: { email, password: 'correct-horse-battery', displayName: name } });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
  const owner = await page.request.get('/api/me/profile');
  expect(owner.ok()).toBeTruthy();
  return { email, profile: (await owner.json()) as { id: string; publicUrl: string } };
}

test('owner can complete a profile and visitors only see the public projection', async ({ page }) => {
  const { email, profile } = await createAccount(page);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Identity', exact: true }).click();
  await page.getByLabel('Display name').fill('  Rowan Example  ');
  await page.getByLabel('Short bio').fill('A writer working across poetry and criticism.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Identity saved');

  const saved = await page.request.get('/api/me/profile');
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json();
  expect(savedBody.displayName).toBe('Rowan Example');
  expect(savedBody.bio).toBe('A writer working across poetry and criticism.');
  expect(savedBody.completeness.complete).toBe(false);
  expect(savedBody.completeness.missing).toContain('opportunityPreferences');

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
  await expect(page.getByRole('link', { name: 'Explore Opportunities' }).first()).toBeVisible();
});

test('profile validation preserves recovery and owner route redirects without a session', async ({ page }) => {
  const { profile } = await createAccount(page);
  await page.goto('/profile?section=identity');
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

test('Profile ledger keeps section URLs and exposes the full facet model progressively', async ({ page }) => {
  await createAccount(page, 'Cross-disciplinary Creator');
  await page.goto('/profile?section=preferences');

  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('section')).toBe('preferences');
  await expect(page.getByText('12-facet model')).toBeVisible();
  const facet = page.getByLabel('Facet');
  await expect(facet.locator('option')).toHaveCount(12);
  await expect(facet.locator('option')).toContainText(['Practice family', 'Discipline', 'Form', 'Genre', 'Subgenre', 'Medium', 'Technique or process', 'Mode or approach', 'Role', 'Theme or subject', 'Audience', 'Language']);
  await expect(page.getByText(/scheme\s+\d/i)).toHaveCount(0);
  await expect(page.getByText(/profile completeness|tracked opportunities|fit score|eligibility score/i)).toHaveCount(0);
  await expect(page.getByText('Request for proposals', { exact: true })).toBeVisible();
  await page.getByLabel('Find a term in Role').fill('screenwriter');
  await expect(page.getByRole('button', { name: 'Screenwriter' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  await page.screenshot({ path: 'outputs/profile-product-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Identity', exact: true }).click();
  await page.getByLabel('Display name').fill('Unsaved name');
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leave with unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('heading', { name: 'Identity', exact: true })).toBeVisible();
});

test.describe('mobile profile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('stays within the viewport and keeps form controls reachable', async ({ page }) => {
    await createAccount(page, 'Mobile Profile User');
    await page.goto('/profile?section=identity');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const inputBox = await page.getByLabel('Display name').boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
    await page.screenshot({ path: 'outputs/profile-product-mobile.png', fullPage: true });
  });
});
