import { expect, test } from '@playwright/test';

test('anonymous opportunities keep canonical taxonomy state across search', async ({ page }) => {
  await page.goto('/opportunities');

  const aria = await page.getByRole('main').ariaSnapshot();
  expect(aria).toContain('heading "Opportunities"');
  expect(aria).toContain('search:');
  expect(aria).toContain('group "Practice family"');

  const practiceFamily = page.getByRole('group', { name: 'Practice family' }).getByRole('checkbox').first();
  await expect(practiceFamily).toBeVisible();
  await practiceFamily.locator('xpath=ancestor::label').click();
  await expect(page).toHaveURL(/taxonomy=/);

  const selectedTaxonomy = new URL(page.url()).searchParams.get('taxonomy');
  expect(selectedTaxonomy).toBeTruthy();
  expect(new URL(page.url()).searchParams.get('taxonomyDescendants')).toBe('1');
  expect(new URL(page.url()).searchParams.get('taxonomyVersion')).toBeTruthy();

  await page.reload();
  await expect(page.getByRole('group', { name: 'Practice family' }).getByRole('checkbox').first()).toBeChecked();

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

test('public crawl endpoints expose only the waitlist acquisition surface', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).toContain('/sitemap.xml');
  expect(robotsBody).toContain('/waitlist');
  expect(robotsBody).toContain('/privacy');
  expect(robotsBody).toContain('/llms.txt');
  expect(robotsBody).not.toContain('/opportunities');
  expect(robotsBody).not.toContain('/opportunities-preview');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain('/waitlist');
  expect(sitemapBody).toContain('/privacy');
  expect(sitemapBody).not.toContain('/opportunities');
  expect(sitemapBody).not.toContain('/opportunities-preview');
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
