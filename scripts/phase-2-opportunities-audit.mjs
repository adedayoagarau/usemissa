import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.MISSA_PHASE2_URL ?? "http://127.0.0.1:3102";
const detailPath = "/opportunities/north-river-review-call-for-submissions";
const outputDirectory = path.resolve(
  process.cwd(),
  "_bmad-output/planning-artifacts/phase-2/opportunities-canonical",
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
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const browseResponse = await page.goto(`${baseURL}/opportunities`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("opportunity-card-north-river-review-call-for-submissions").waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-browse.png`), fullPage: true });
  const browseAxe = await new AxeBuilder({ page }).analyze();
  const browseMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    cards: document.querySelectorAll("[data-testid^='opportunity-card-']").length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  const detailResponse = await page.goto(`${baseURL}${detailPath}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-detail.png`), fullPage: true });
  const detailAxe = await new AxeBuilder({ page }).analyze();
  const detailMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    sections: document.querySelectorAll("article section").length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    metadataScripts: document.querySelectorAll('script[type="application/ld+json"]').length,
  }));

  results.push({
    viewport,
    browse: {
      httpStatus: browseResponse?.status() ?? null,
      ...browseMetrics,
      seriousAxeViolations: browseAxe.violations.filter(({ impact }) => impact === "critical" || impact === "serious").map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
    detail: {
      httpStatus: detailResponse?.status() ?? null,
      ...detailMetrics,
      seriousAxeViolations: detailAxe.violations.filter(({ impact }) => impact === "critical" || impact === "serious").map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
    consoleErrors,
  });
  await context.close();
}

await browser.close();
const report = { baseURL, outputDirectory, results };
await writeFile(path.join(outputDirectory, "audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
