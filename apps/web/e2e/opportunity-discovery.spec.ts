import { expect, test } from '@playwright/test';

test('anonymous discovery keeps canonical taxonomy state across search and categories', async ({ page }) => {
  await page.goto('/opportunities-preview');

  const aria = await page.getByRole('main').ariaSnapshot();
  expect(aria).toContain('heading "Explore opportunities"');
  expect(aria).toContain('search:');
  expect(aria).toContain('combobox "Discipline"');

  const discipline = page.getByLabel('Discipline');
  await expect(discipline).toBeVisible();
  await discipline.selectOption({ index: 1 });
  await expect(page).toHaveURL(/taxonomy=/);

  const selectedTaxonomy = new URL(page.url()).searchParams.get('taxonomy');
  expect(selectedTaxonomy).toBeTruthy();
  expect(new URL(page.url()).searchParams.get('taxonomyDescendants')).toBe('1');
  expect(new URL(page.url()).searchParams.get('taxonomyVersion')).toBeTruthy();

  await page.reload();
  await expect(discipline).toHaveValue(selectedTaxonomy!);

  const search = page.getByRole('search').getByLabel('Search opportunities or organizations');
  await search.fill('example search');
  await search.press('Enter');
  await expect(page).toHaveURL(/q=example(?:%20|\+)search/);
  expect(new URL(page.url()).searchParams.get('taxonomy')).toBe(selectedTaxonomy);

  await page.getByRole('link', { name: 'Grants', exact: true }).click();
  await expect(page).toHaveURL(/category=grants/);
  expect(new URL(page.url()).searchParams.get('taxonomy')).toBe(selectedTaxonomy);
  expect(new URL(page.url()).searchParams.get('q')).toBe('example search');
});

test('anonymous empty states explain a failed search and offer recovery', async ({ page }) => {
  await page.goto('/opportunities-preview?q=definitely-no-missa-opportunity-9f3d');

  await expect(page.getByText('No opportunities match.', { exact: true })).toBeVisible();
  await expect(page.getByText(/No opportunities match “definitely-no-missa-opportunity-9f3d”/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clear filters', exact: true })).toBeVisible();
});

test('public crawl endpoints expose only the intended discovery surfaces', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('/sitemap.xml');
  expect(await robots.text()).toContain('/opportunities-preview');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain('/opportunities-preview');
  expect(sitemapBody).toContain('/for-organizations');
  expect(sitemapBody).not.toContain('usemissa.com/opportunities/');
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

    const detailPage = await request.get(`/discover/opportunities/${firstOpportunity.slug}`);
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
