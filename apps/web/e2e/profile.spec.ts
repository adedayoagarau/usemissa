import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await expect(page.getByRole('heading', { name: 'Public identity' })).toBeVisible();
  await page.getByLabel('Name').fill('Rowan Example');
  await page.getByLabel('About').fill('A writer working across poetry and criticism.');
  await page.getByRole('switch', { name: 'Allow messages through your Profile' }).click();
  await page.getByRole('button', { name: 'Save and publish' }).click();
  await expect(page.getByRole('status')).toHaveText('Your public Profile is updated.');

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
  expect(publicBody).toMatchObject({ id: profile.id, displayName: 'Rowan Example', bio: 'A writer working across poetry and criticism.', contactEnabled: true });
  expect(publicBody.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(JSON.stringify(publicBody)).not.toContain(email);
  expect(publicBody).not.toHaveProperty('attributes');
  expect(publicBody).not.toHaveProperty('genres');

  await page.request.post('/api/auth/logout');
  await page.goto(`/profile/${profile.id}`);
  await expect(page.getByRole('heading', { name: 'Rowan Example' })).toBeVisible();
  await expect(page.getByText('A writer working across poetry and criticism.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(email);
  await expect(page.getByRole('button', { name: 'Get in touch' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
});

test('profile validation preserves recovery and owner route redirects without a session', async ({ page }) => {
  const { profile } = await createAccount(page);
  await page.goto('/profile');
  await page.getByLabel('Name').fill('');
  await page.getByRole('button', { name: 'Save and publish' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Add your public name.');

  await page.getByLabel('Name').fill('Still here');
  await page.getByLabel('About').fill('x'.repeat(1000));
  await page.getByLabel('About').press('End');
  await page.keyboard.type('x');
  await expect(page.getByLabel('About')).toHaveValue('x'.repeat(1000));

  const ownerAfterInvalid = await page.request.get('/api/me/profile');
  const ownerBody = await ownerAfterInvalid.json();
  expect(ownerBody.displayName).toBe('Profile Test User');
  expect(ownerBody.bio).toBeUndefined();

  await page.request.post('/api/auth/logout');
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  expect(profile.id).toMatch(/^user_/);
});

test('a Library Work can publish a passage and whole-Profile unpublish removes the public projection', async ({ page }) => {
  const { profile } = await createAccount(page, 'Passage Test User');
  const createdWork = await page.request.post('/api/me/library/works', {
    data: {
      title: 'The Harmattan Year',
      description: 'An essay about dust and inheritance.',
      taxonomyTermIds: ['taxterm_medium-text'],
    },
  });
  expect(createdWork.status()).toBe(201);
  const work = await createdWork.json() as { id: string; title: string };

  const published = await page.request.patch('/api/me/profile/public', {
    data: {
      displayName: 'Passage Test User',
      oneLine: 'Writes essays about home and memory.',
      socialLinks: [],
      selectedWorks: [{
        id: 'featured-work',
        workId: work.id,
        title: 'A client title that must be ignored',
        sample: {
          kind: 'text',
          excerpt: 'The dust came early that year. We swept twice a day.',
          rightsConfirmed: true,
        },
      }],
    },
  });
  expect(published.ok()).toBeTruthy();
  const publicWork = (await published.json()).profile.selectedWorks[0];
  expect(publicWork).toMatchObject({ workId: work.id, title: work.title, sample: { kind: 'text', excerpt: 'The dust came early that year. We swept twice a day.' } });
  expect(publicWork.sample.rightsConfirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(publicWork.sample).not.toHaveProperty('rightsConfirmed');
  expect(JSON.stringify(publicWork)).not.toContain('sampleSourceFileId');

  const blockedDelete = await page.request.delete(`/api/me/library/works/${work.id}`);
  expect(blockedDelete.status()).toBe(409);

  const unpublished = await page.request.delete('/api/me/profile/public');
  expect(unpublished.ok()).toBeTruthy();
  const publicResponse = await page.request.get(`/api/profile/${profile.id}`);
  expect(await publicResponse.json()).toEqual({ isPrivate: true });
  const deleted = await page.request.delete(`/api/me/library/works/${work.id}`);
  expect(deleted.ok()).toBeTruthy();
});

test('Profile ledger keeps section URLs and exposes the full facet model progressively', async ({ page }) => {
  await createAccount(page, 'Cross-disciplinary Creator');
  await page.goto('/settings?section=preferences');

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

  await page.getByRole('button', { name: 'Screenwriter' }).click();
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leave with unsaved changes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
});

test.describe('mobile profile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('stays within the viewport and keeps form controls reachable', async ({ page }) => {
    await createAccount(page, 'Mobile Profile User');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Public identity' })).toBeVisible();
    expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const inputBox = await page.getByLabel('Name').boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(44);
    await page.getByLabel('Name').fill('Mobile Profile User edited');
    await expect(page.getByRole('button', { name: 'Save and publish' })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
    await page.screenshot({ path: 'outputs/profile-product-mobile.png', fullPage: true });
  });
});
