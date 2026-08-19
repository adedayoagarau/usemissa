import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const bannedPublicCopy = /source snapshot|next refresh|freshness signal|profile completeness|\bverified\b/iu;

test('public Home leads with useful Opportunities and no operational theatre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your next opportunity' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'See what is worth your time.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the index' }).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText(bannedPublicCopy);
  await expect(page.locator('img[src*="/media/home/"]')).toHaveCount(0);
  // Audit the settled page: the hero's load-once entrance motion animates
  // opacity, and axe must not sample text mid-fade.
  await page.waitForTimeout(1600);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('selected public pages keep evidence language customer-safe', async ({ page }) => {
  for (const path of ['/about', '/methodology', '/guides', '/guides/find-submission-opportunities', '/discover/grants']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(bannedPublicCopy);
    await expect(page.getByRole('link', { name: 'Missa home' }).first()).toBeVisible();
  }
  await page.goto('/methodology');
  await expect(page.getByRole('heading', { name: 'Facts are not scores.' })).toBeVisible();
  await expect(page.getByText('Publication is not a guarantee')).toBeVisible();
});

test('For Organizations distinguishes available, limited, and planned capability', async ({ page }) => {
  await page.goto('/for-organizations');
  await expect(page.getByRole('heading', { name: 'Run the whole Opportunity without losing the individual Work.' })).toBeVisible();
  await expect(page.getByText('Available', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Limited', { exact: true })).toHaveCount(4);
  await expect(page.getByText('Planned', { exact: true })).toHaveCount(1);
  await expect(page.locator('main')).not.toContainText(/132 submissions|emails queued|Northline Arts Foundation/iu);
});

test('waitlist preserves bounded campaign attribution and keeps the public conversion path', async ({ page }) => {
  await page.goto('/waitlist?utm_source=bedside&utm_campaign=public-redesign&secret=drop-me');
  await expect(page).toHaveURL(/\/waitlist\?utm_source=bedside&utm_campaign=public-redesign$/u);
  await expect(page.getByRole('heading', { name: /There is a god in every door/u })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join the waitlist', exact: true })).toBeVisible();
  expect(page.url()).not.toContain('secret=');
});

test('waitlist exposes answer-first content to crawlers and AI search', async ({ page }) => {
  await page.goto('/waitlist');
  await expect(page.locator('main')).toContainText('Missa helps creators find, prepare for, and track creative opportunities.');
  await expect(page.locator('main')).toContainText('Missa earns trust by showing where its information comes from');

  const jsonLd = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
    nodes.map((node) => JSON.parse(node.textContent ?? '{}') as {
      '@type'?: string;
      mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }>;
    }),
  );
  const faqSchema = jsonLd.find((item) => item['@type'] === 'FAQPage');
  expect(faqSchema).toBeDefined();
  expect(faqSchema?.mainEntity).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: 'Can I trust Missa?',
      acceptedAnswer: expect.objectContaining({ text: expect.stringContaining('showing where its information comes from') }),
    }),
  ]));
});

test('waitlist includes its FAQ answers in the initial HTML response', async ({ request }) => {
  const response = await request.get('/waitlist');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('Missa earns trust by showing where its information comes from');
  expect(html).toContain('FAQPage');
});

test('waitlist exposes its public crawler surface', async ({ request }) => {
  const [robotsResponse, sitemapResponse, llmsResponse] = await Promise.all([
    request.get('/robots.txt'),
    request.get('/sitemap.xml'),
    request.get('/llms.txt'),
  ]);
  expect(robotsResponse.ok()).toBeTruthy();
  expect(sitemapResponse.ok()).toBeTruthy();
  expect(llmsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  const sitemap = await sitemapResponse.text();
  const llms = await llmsResponse.text();
  expect(robots).toContain('User-Agent: OAI-SearchBot');
  expect(robots).toContain('Allow: /waitlist');
  expect(robots).toContain('Allow: /llms.txt');
  expect(robots).toContain('Disallow: /');
  expect(sitemap).toContain('/waitlist');
  expect(llms).toContain('Missa helps creators and organizations find, prepare for, and track creative opportunities.');
  expect(llms).toContain('official source');
});

test('waitlist form sends only approved campaign fields', async ({ page }) => {
  await page.route('**/api/waitlist', async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ source: '/waitlist', website: '' });
    expect(body.campaign).toMatchObject({ utm_source: 'bedside', utm_campaign: 'public-redesign', device_class: 'desktop' });
    expect(Object.keys(body.campaign as Record<string, unknown>).every((key) => ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer_host', 'device_class'].includes(key))).toBeTruthy();
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ accepted: true }) });
  });
  await page.goto('/waitlist?utm_source=bedside&utm_campaign=public-redesign&secret=drop-me');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByRole('button', { name: 'Join the waitlist', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('You’re on the list');
});

test('waitlist records the bounded acquisition funnel events', async ({ page }) => {
  const eventNames: string[] = [];
  await page.route('**/api/analytics/events', async (route) => {
    const body = route.request().postDataJSON() as { eventName?: string };
    if (body.eventName) eventNames.push(body.eventName);
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ accepted: true }) });
  });
  await page.route('**/api/waitlist', async (route) => {
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ accepted: true }) });
  });
  await page.goto('/waitlist');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByRole('button', { name: 'Join the waitlist', exact: true }).click();
  await expect.poll(() => eventNames).toEqual(expect.arrayContaining([
    'public.waitlist_form_started',
    'public.waitlist_cta_clicked',
    'public.waitlist_submit_attempted',
  ]));
});

test('production public shell can be restricted to the waitlist surface', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__missaProductionGate', { value: true });
  });
  await page.goto('/waitlist');
  await expect(page.getByRole('heading', { name: /There is a god in every door/u })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
});

test('public system reflows cleanly at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/methodology', '/guides', '/discover/residencies', '/for-organizations']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path} overflowed`).toBeTruthy();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  }
  await page.goto('/');
  await page.screenshot({ path: 'outputs/public-product-home-mobile.png', fullPage: true });
});
