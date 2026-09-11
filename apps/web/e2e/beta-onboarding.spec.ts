import { test, expect } from '@playwright/test';

test('onboarding persists, and failed saves keep the current step', async ({page}) => {
  const email=`beta-setup-${Date.now()}@example.com`;
  const response=await page.request.post('/api/auth/signup',{data:{email,password:'correct-horse-battery',displayName:'Beta QA'}});
  expect(response.ok()).toBeTruthy();
  await page.goto('/onboarding');
  await expect(page.getByRole('heading',{name:'What do you make?'})).toBeVisible();
  await page.route('**/api/me/onboarding',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));
  await page.getByRole('button',{name:'Skip setup'}).click();
  await expect(page.getByText('We could not save this change. Please try again.')).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.unroute('**/api/me/onboarding');
  await page.getByRole('button',{name:'Skip setup'}).click();
  await expect(page).toHaveURL(/\/tracker$/);
  await page.goto('/onboarding');
  await expect(page.getByText('Your declared preferences')).toBeVisible();
});
