import { expect, test } from '@playwright/test';

test('browse interactions stay in sync from filters to detail tabs and bookmarks', async ({ page }) => {
  const email = `opportunities-${Date.now()}@example.com`;
  await page.goto('/signup?next=/opportunities');
  await page.getByLabel('Your name').fill('Opportunity Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/opportunities$/);

  await page.getByRole('button', { name: 'Genre' }).click();
  await page.getByRole('checkbox', { name: 'Poetry' }).check();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/genre=poetry/);
  await expect(page.getByText(/active/)).toBeVisible();
  await page.getByRole('link', { name: 'Clear all' }).click();

  const bookmark = page.getByRole('button', { name: 'Bookmark opportunity' }).first();
  await bookmark.click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' }).first()).toBeVisible();

  await page.locator('article a').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('tab', { name: 'Eligibility' }).click();
  await expect(page.getByRole('tabpanel')).toContainText(/Eligibility/);
  await page.getByRole('tab', { name: 'What you need' }).click();
  await expect(page.getByRole('tabpanel')).toContainText(/What you need/);
});

test('mobile detail opens as a dismissible sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `mobile-opportunities-${Date.now()}@example.com`;
  await page.goto('/signup?next=/opportunities');
  await page.getByLabel('Your name').fill('Mobile Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  const firstOpportunity = page.locator('article a').first();
  await firstOpportunity.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
