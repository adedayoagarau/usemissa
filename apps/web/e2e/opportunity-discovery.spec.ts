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

  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  const llmsText = await llms.text();
  expect(llmsText).toContain('source-first opportunity library');
  expect(llmsText).toContain('https://www.usemissa.com/sitemap.xml');

  const home = await request.get('/');
  expect(home.status()).toBe(200);
  const homeHtml = await home.text();
  expect(homeHtml).toContain('"@type":"Organization"');
  expect(homeHtml).toContain('"@type":"WebSite"');
  expect(homeHtml).toContain('"@type":"FAQPage"');
  expect(homeHtml).toContain('Source-first opportunities for creators');
  expect(homeHtml).toContain('What is Missa?');

  const socialImage = await request.get('/opengraph-image');
  expect(socialImage.status()).toBe(200);
  expect(socialImage.headers()['content-type']).toContain('image/png');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain('/opportunities-preview');
  expect(sitemapBody).toContain('/for-creators');
  expect(sitemapBody).toContain('/for-organizations');
  expect(sitemapBody).toContain('/about');
  expect(sitemapBody).toContain('/methodology');
  expect(sitemapBody).toContain('/discover/contests');
  expect(sitemapBody).toContain('<lastmod>2026-08-11T00:00:00.000Z</lastmod>');
  expect(sitemapBody).not.toContain('usemissa.com/opportunities/');

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

  const creators = await request.get('/for-creators');
  expect(creators.status()).toBe(200);
  const creatorsHtml = await creators.text();
  expect(creatorsHtml).toContain('Opportunities for creators');
  expect(creatorsHtml).toContain('FAQPage');
  expect(creatorsHtml).toContain('/discover/grants');

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

    const detailPage = await request.get(`/discover/opportunities/${firstOpportunity.slug}`);
    expect(detailPage.status()).toBe(200);
    const detailHtml = await detailPage.text();
    expect(detailHtml).toContain(firstOpportunity.title);
    expect(detailHtml).toContain('application/ld+json');
    if (firstOpportunity.source?.url) {
      expect(detailHtml).toContain('isBasedOn');
      expect(detailHtml).toContain('citation');
      expect(detailHtml).toContain(firstOpportunity.source.url);
    }
  }

  const taxonomy = await request.get('/api/taxonomy');
  expect(taxonomy.status()).toBe(200);
  expect(taxonomy.headers()['content-type']).toContain('application/json');
  const taxonomyBody = await taxonomy.json();
  expect(taxonomyBody.scheme.version).toBeGreaterThan(0);
  expect(taxonomyBody.terms.length).toBeGreaterThan(0);
});
