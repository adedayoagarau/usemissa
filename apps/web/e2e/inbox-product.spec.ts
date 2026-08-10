import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function loginAsAda(page: import('@playwright/test').Page) {
  const response = await page.request.post('/api/auth/login', { data: { email: 'ada@example.com', password: 'poetry-and-fiction' } });
  expect(response.ok()).toBeTruthy();
  const profile = await page.request.get('/api/me/profile');
  expect(profile.ok()).toBeTruthy();
  return profile.json() as Promise<{ id: string }>;
}

test('Option 2 Inbox groups real owner alerts and persists read state', async ({ page }) => {
  const session = await loginAsAda(page);
  await page.goto('/inbox');

  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Your Missa briefing', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Inbox views' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Briefing/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText(/source confidence|prediction confidence|matched confidence|classification|recently updated/i)).toHaveCount(0);

  const inbox = await page.request.get(`/api/users/${session.id}/inbox`);
  const body = await inbox.json() as { newForYou: Array<{ id: string }> };
  const first = body.newForYou[0];
  expect(first).toBeTruthy();
  const read = await page.request.post('/api/me/inbox/read', { data: { ids: [first!.id] } });
  expect(read.ok()).toBeTruthy();
  expect(await read.json()).toMatchObject({ updated: 1 });

  await page.screenshot({ path: 'outputs/inbox-option-02-desktop.png', fullPage: true });
});

test('Email review uses customer language and confirms only after a decision', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAda(page);
  await page.route('**/api/me/email-candidates?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pendingCount: 1,
        candidates: [{
          id: 'candidate-one',
          classification: 'ambiguous',
          state: 'pending',
          sourceMode: 'forwarding',
          senderDomain: 'journal.example',
          subject: 'Your submission is now in review',
          bodyExcerpt: 'Thank you. Your submission is now with our review panel.',
          candidates: [
            { opportunityId: 'opp-one', title: 'Autumn Fiction Prize', organizationName: 'Example Journal' },
            { opportunityId: 'opp-two', title: 'Winter Fiction Prize', organizationName: 'Example Journal' },
          ],
          proposedStatus: 'in-review',
          confidence: 'possible',
          warnings: ['ambiguous_match'],
          evidenceReasons: ['internal matcher reason'],
          attachmentMetadata: [],
        }],
      }),
    });
  });
  await page.route('**/api/me/email-candidates/candidate-one/review', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidate: { id: 'candidate-one' } }) });
  });

  await page.goto('/inbox?view=email');
  await expect(page.getByRole('heading', { name: 'Email review' })).toBeVisible();
  await expect(page.getByText('Choose the related Tracker record.').first()).toBeVisible();
  await expect(page.getByText(/possible confidence|ambiguous|classification|internal matcher reason/i)).toHaveCount(0);
  await page.getByRole('button', { name: /Your submission is now in review/ }).click();
  await expect(page.getByRole('button', { name: 'Back to email updates' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
  await page.screenshot({ path: 'outputs/inbox-option-02-email-review-mobile.png', fullPage: true });
  await page.getByLabel('Related Tracker record').selectOption('opp-two');
  await page.getByRole('button', { name: 'Confirm update' }).click();
  await expect(page.getByText('Tracker update confirmed.', { exact: true })).toBeVisible();
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
