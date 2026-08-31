import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.MISSA_PHASE0_URL ?? 'http://127.0.0.1:3102';
const outputDirectory = path.resolve(
  process.cwd(),
  '_bmad-output/planning-artifacts/phase-0/opportunities-baseline',
);

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-428', width: 428, height: 926 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const response = await page.goto(`${baseURL}/opportunities`, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('#results-heading').waitFor();
  await page.locator('article').first().waitFor();
  const listPath = path.join(outputDirectory, `${viewport.name}-list.png`);
  await page.screenshot({ path: listPath, fullPage: true });

  const listAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const listMetrics = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim() ?? null,
    resultHeading: document.querySelector('#results-heading')?.textContent?.trim() ?? null,
    cards: document.querySelectorAll('article').length,
    links: document.querySelectorAll('a').length,
    buttons: document.querySelectorAll('button').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    navigation: performance.getEntriesByType('navigation').map((entry) => ({
      domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
      load: Math.round(entry.loadEventEnd),
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
    })),
  }));

  const firstOpportunity = page.locator('article a[href^="/opportunities/"]').first();
  const detailHref = await firstOpportunity.getAttribute('href');
  let detail = null;
  if (detailHref) {
    const detailResponse = await page.goto(`${baseURL}${detailHref}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('h1').waitFor();
    const detailPath = path.join(outputDirectory, `${viewport.name}-detail.png`);
    await page.screenshot({ path: detailPath, fullPage: true });
    const detailAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    detail = await page.evaluate(() => ({
      status: document.body.dataset.nextErrorH1 ? 500 : null,
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.trim() ?? null,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    detail.httpStatus = detailResponse?.status() ?? null;
    detail.axeViolations = detailAxe.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      nodes: item.nodes.length,
    }));
  }

  results.push({
    viewport,
    list: {
      httpStatus: response?.status() ?? null,
      ...listMetrics,
      axeViolations: listAxe.violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.length,
      })),
    },
    detailHref,
    detail,
  });
  await context.close();
}

await browser.close();
process.stdout.write(`${JSON.stringify({ baseURL, outputDirectory, results }, null, 2)}\n`);
