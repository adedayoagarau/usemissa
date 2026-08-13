import { expect, test } from '@playwright/test';

test('anonymous opportunities keep canonical taxonomy state across search', async ({ page }) => {
  await page.goto('/opportunities');

  const aria = await page.getByRole('main').ariaSnapshot();
  expect(aria).toContain('heading "Opportunities"');
  expect(aria).toContain('search:');
  expect(aria).toContain('group "Field"');

  const practiceFamily = page.getByRole('group', { name: 'Field' }).getByRole('checkbox').first();
  await expect(practiceFamily).toBeVisible();
  await practiceFamily.locator('xpath=ancestor::label').click();
  await expect(page).toHaveURL(/taxonomy=/);

  const selectedTaxonomy = new URL(page.url()).searchParams.get('taxonomy');
  expect(selectedTaxonomy).toBeTruthy();
  expect(new URL(page.url()).searchParams.get('taxonomyDescendants')).toBe('1');
  expect(new URL(page.url()).searchParams.get('taxonomyVersion')).toBeTruthy();

  await page.reload();
  await expect(page.getByRole('group', { name: 'Field' }).getByRole('checkbox').first()).toBeChecked();

  const search = page.getByRole('search').getByLabel('Search opportunities or organizations');
  await search.fill('example search');
  await search.press('Enter');
  await expect(page).toHaveURL(/q=example(?:%20|\+)search/);
  expect(new URL(page.url()).searchParams.get('taxonomy')).toBe(selectedTaxonomy);
});

test('anonymous empty states explain a failed search and offer recovery', async ({ page }) => {
  await page.goto('/opportunities?q=definitely-no-missa-opportunity-9f3d');

  await expect(page.getByRole('heading', { name: 'No opportunities match these filters' })).toBeVisible();
  await expect(page.getByText(/No opportunities match “definitely-no-missa-opportunity-9f3d”/)).toBeVisible();
  await expect(page.getByText('Clear filters', { exact: true })).toBeVisible();
});

test('legacy preview redirects to the canonical catalogue without dropping filters', async ({ request }) => {
  const response = await request.get('/opportunities-preview?q=poetry&type=grant', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe('/opportunities?q=poetry&type=grant');
});

test('public crawl endpoints expose only the intended discovery surfaces', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('/sitemap.xml');
  expect(await robots.text()).toContain('/opportunities');
  expect(await robots.text()).not.toContain('/opportunities-preview');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain('/opportunities');
  expect(sitemapBody).not.toContain('/opportunities-preview');
  expect(sitemapBody).toContain('/for-organizations');
  expect(sitemapBody).toContain('/about');
  expect(sitemapBody).toContain('/methodology');
  expect(sitemapBody).toContain('/discover/contests');
  expect(sitemapBody).toContain('<lastmod>2026-08-07T00:00:00.000Z</lastmod>');

  const contests = await request.get('/discover/contests');
  expect(contests.status()).toBe(200);
  const contestsHtml = await contests.text();
  expect(contestsHtml).toContain('Contests for creators');
  expect(contestsHtml).toContain('Compare these facts');
  expect(contestsHtml).toContain('application/ld+json');

  const guide = await request.get('/guides/verify-an-opportunity-before-applying');
  expect(guide.status()).toBe(200);
  const guideHtml = await guide.text();
  expect(guideHtml).toContain('Questions creators ask');
  expect(guideHtml).toContain('FAQPage');

  for (const path of ['/about', '/methodology']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect((await response.text())).toContain('application/ld+json');
  }
});

test('public discovery APIs return bounded JSON without leaking an auth failure', async ({ request }) => {
  const opportunities = await request.get('/api/opportunities?limit=5');
  expect(opportunities.status()).toBe(200);
  expect(opportunities.headers()['content-type']).toContain('application/json');
  const opportunityBody = await opportunities.json();
  expect(opportunityBody.query.limit).toBe(5);
  expect(Array.isArray(opportunityBody.items)).toBe(true);

  const firstOpportunity = opportunityBody.items[0];
  if (firstOpportunity) {
    const detailApi = await request.get(`/api/opportunities/${firstOpportunity.slug}`);
    expect(detailApi.status()).toBe(200);
    const detailBody = await detailApi.json();
    expect(detailBody.title).toBe(firstOpportunity.title);

    const detailPage = await request.get(`/opportunities/${firstOpportunity.slug}`);
    expect(detailPage.status()).toBe(200);
    const detailHtml = await detailPage.text();
    expect(detailHtml).toContain(firstOpportunity.title);
    expect(detailHtml).toContain('application/ld+json');
  }

  const taxonomy = await request.get('/api/taxonomy');
  expect(taxonomy.status()).toBe(200);
  expect(taxonomy.headers()['content-type']).toContain('application/json');
  const taxonomyBody = await taxonomy.json();
  expect(taxonomyBody.scheme.version).toBeGreaterThan(0);
  expect(taxonomyBody.terms.length).toBeGreaterThan(0);
});
