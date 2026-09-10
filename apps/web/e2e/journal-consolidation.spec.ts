import { test, expect } from '@playwright/test';

test('legacy journal resolves to the canonical design with rankings and official links', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const redirect = await page.request.get('/journals/cincinnati-review?from=ranking', {maxRedirects:0});
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe('/journal/cincinnati-review?from=ranking');
  await page.goto('/journals/cincinnati-review?from=ranking');
  await expect(page).toHaveURL(/\/journal\/cincinnati-review\?from=ranking$/);
  await expect(page.getByRole('heading',{level:1,name:'Cincinnati Review'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Submitting your work',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Editorial details and rankings',exact:true}).click();
  await expect(page.getByText('Missa rankings',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Original profile/})).toHaveCount(0);
  await expect(page.locator('a[href*="pw.org"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('canonical profile retains legacy prize history and contact information',async({page})=>{
  await page.goto('/journal/a-public-space');
  await expect(page.getByRole('heading',{level:1,name:'A Public Space'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Prize history'})).toBeVisible();
  await expect(page.getByText('Dorthe Nors',{exact:true})).toBeVisible();
  await expect(page.locator('a[href="mailto:submissions@apublicspace.org"]')).toBeVisible();
});
