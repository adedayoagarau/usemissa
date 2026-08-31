import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.MISSA_PHASE1_URL ?? "http://127.0.0.1:3102";
const route = "/design-system/opportunities-overhaul";
const outputDirectory = path.resolve(
  process.cwd(),
  "_bmad-output/planning-artifacts/phase-1/opportunities-disclosure",
);
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-428", width: 428, height: 926 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const browseResponse = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.getByTestId("opportunity-card-complete").waitFor();
  await page.screenshot({
    path: path.join(outputDirectory, `${viewport.name}-browse.png`),
    fullPage: true,
  });
  const browseAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const browseMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    cards: document.querySelectorAll("[data-testid^='opportunity-card-']").length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  const detailResponse = await page.goto(`${baseURL}${route}?fixture=long-title`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.screenshot({
    path: path.join(outputDirectory, `${viewport.name}-detail.png`),
    fullPage: true,
  });
  const detailAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const detailMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    sections: document.querySelectorAll("article section").length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  results.push({
    viewport,
    browse: {
      httpStatus: browseResponse?.status() ?? null,
      ...browseMetrics,
      axeViolations: browseAxe.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
    detail: {
      httpStatus: detailResponse?.status() ?? null,
      ...detailMetrics,
      axeViolations: detailAxe.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
  });
  await context.close();
}

await browser.close();
process.stdout.write(`${JSON.stringify({ baseURL, outputDirectory, results }, null, 2)}\n`);
