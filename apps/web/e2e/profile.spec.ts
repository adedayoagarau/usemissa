import { expect, test } from '@playwright/test';

test('a new user can complete profile sections and keep materials after reload', async ({ page }) => {
  const email = `profile-${Date.now()}@example.com`;
  await page.goto('/signup?next=/profile');
  await page.getByLabel('Your name').fill('Profile Writer');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Make your work easier to find.' })).toBeVisible();

  await page.getByRole('button', { name: /Your practice/ }).click();
  await page.getByLabel('Disciplines').fill('Poetry');
  await page.getByLabel('Genres and forms').fill('Essays');
  await page.getByRole('button', { name: 'Save changes' }).last().click();
  await expect(page.getByText('Ready for recommendations')).toBeVisible();

  await page.getByRole('button', { name: /Your work/ }).click();
  await page.getByLabel('Title').fill('Night River');
  await page.getByLabel('Content or notes').fill('A poetry manuscript.');
  await page.getByRole('button', { name: 'Add material' }).click();
  await expect(page.getByText('Night River')).toBeVisible();
  await expect(page.getByText('Ready to apply')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: /Your work/ }).click();
  await expect(page.getByText('Night River')).toBeVisible();
  await page.goto('/library');
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole('heading', { name: 'Your work, ready when you are.' })).toBeVisible();
  await expect(page.getByText('Night River')).toBeVisible();

  const browseResponse = await page.request.get('/api/opportunities?q=North%20River');
  const browse = await browseResponse.json();
  const submissionItem = browse.items.find((item: { submissionAvailable?: boolean }) => item.submissionAvailable) ?? browse.items[0];
  await page.goto(`/opportunities/${submissionItem.id}`);
  await expect(page.getByRole('heading', { name: new RegExp(submissionItem.title) }).last()).toBeVisible();
  await page.locator('a[href$="/submit"]').first().click();
  await expect(page.getByRole('heading', { name: new RegExp(submissionItem.title) }).last()).toBeVisible();
  await expect(page.getByText('Night River')).toBeVisible();
  await page.getByRole('button', { name: 'I submitted this' }).click();
  await expect(page.getByText('Tracker updated to Submitted')).toBeVisible();
});
