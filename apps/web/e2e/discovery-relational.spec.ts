import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function createDiscoveryAccount(page: Page) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const signup = await page.request.post('/api/auth/signup', {
    data: { email: `discovery-${suffix}@example.com`, password: 'correct-horse-battery', displayName: 'Discovery User' },
  });
  expect(signup.status()).toBe(201);
  const sessionCookie = signup.headers()['set-cookie']?.match(/(?:^|,\s*)missa_session=([^;]+)/)?.[1];
  expect(sessionCookie).toBeTruthy();
  await page.context().addCookies([{ name: 'missa_session', value: sessionCookie!, url: new URL(signup.url()).origin, httpOnly: true, sameSite: 'Lax' }]);
  const profile = await page.request.get('/api/me/profile');
  expect(profile.ok()).toBeTruthy();
  return await profile.json() as { id: string };
}

test('Discovery saved searches create and delete through relational Profile APIs', async ({ page }) => {
  const profile = await createDiscoveryAccount(page);
  await page.goto('/profile?section=searches');
  await expect(page.locator('#profile-section-heading')).toHaveText('Saved searches');
  await page.getByRole('button', { name: 'New saved search' }).click();
  await page.getByLabel('Name').fill('No-fee fixture calls');
  await page.getByRole('checkbox', { name: 'No fee only' }).check();
  await page.getByRole('button', { name: 'Save search' }).click();
  await expect(page.getByText('No-fee fixture calls').last()).toBeVisible();

  const saved = await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/profiles`);
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json() as { profiles?: Array<{ name: string }> } | Array<{ name: string }>;
  const profiles = Array.isArray(savedBody) ? savedBody : savedBody.profiles ?? [];
  expect(profiles).toContainEqual(expect.objectContaining({ name: 'No-fee fixture calls' }));

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No saved searches yet')).toBeVisible();
});

test('Discovery organization follow persists and appears in Profile', async ({ page }) => {
  const profile = await createDiscoveryAccount(page);
  await page.goto('/opportunities/story-16-2-browser-fixture');
  await page.getByRole('button', { name: 'Follow organization' }).click();
  await expect(page.getByText('Following', { exact: true })).toBeVisible();

  const following = await page.request.get(`/api/users/${encodeURIComponent(profile.id)}/following`);
  expect(following.ok()).toBeTruthy();
  expect(JSON.stringify(await following.json())).toContain('org_story-16-2-e2e');

  await page.goto('/profile?section=following');
  await expect(page.locator('#profile-section-heading')).toHaveText('Following');
  await expect(page.getByText('Fixture Journal', { exact: true })).toBeVisible();
});

test('Discovery catalogue and canonical detail reflow without serious axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/opportunities');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  let axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);

  await page.goto('/opportunities/story-16-2-browser-fixture');
  await expect(page.getByRole('heading', { level: 1, name: 'Story 16.2 Browser Fixture' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});
