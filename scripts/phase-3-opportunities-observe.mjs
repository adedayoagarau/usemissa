import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.MISSA_PHASE3_URL;
if (!baseURL) throw new Error("MISSA_PHASE3_URL is required");

const expectedPresentation = process.env.MISSA_PHASE3_PRESENTATION ?? "disclosure-v2";
const outputDirectory = path.resolve(
  process.cwd(),
  process.env.MISSA_PHASE3_OUTPUT ?? "_bmad-output/planning-artifacts/phase-3/opportunities-observation",
);
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const apiContext = await browser.newContext();
const apiPage = await apiContext.newPage();
const apiResponse = await apiPage.request.get(`${baseURL}/api/opportunities?limit=5`);
if (apiResponse.status() !== 200) throw new Error(`Browse API returned ${apiResponse.status()}`);
const api = await apiResponse.json();
const opportunity = api.items?.[0];
if (!opportunity?.slug || !opportunity?.title) throw new Error("Browse API returned no observable opportunity");
const sourceKeys = Object.keys(opportunity.source ?? {}).sort();
if (sourceKeys.join(",") !== "kind,name,url") {
  throw new Error(`Unexpected public source fields: ${sourceKeys.join(",")}`);
}
await apiContext.close();

const results = [];
for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const browseResponse = await page.goto(`${baseURL}/opportunities`, { waitUntil: "domcontentloaded" });
  const browsePath = new URL(page.url()).pathname;
  if (browsePath !== "/opportunities") throw new Error(`Browse redirected to ${browsePath}`);
  const browseShell = page.locator("[data-opportunity-presentation]");
  await browseShell.waitFor();
  const browsePresentation = await browseShell.getAttribute("data-opportunity-presentation");
  await page.getByTestId(`opportunity-card-${opportunity.slug}`).waitFor();
  await page.waitForTimeout(250);
  const browseAxe = await new AxeBuilder({ page }).analyze();
  await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-browse.png`), fullPage: true });
  const browseMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    resultLabel: document.querySelector("[id='results-heading']")?.textContent?.trim() ?? null,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  const detailResponse = await page.goto(`${baseURL}/opportunities/${opportunity.slug}`, { waitUntil: "domcontentloaded" });
  const detailPath = new URL(page.url()).pathname;
  if (detailPath !== `/opportunities/${opportunity.slug}`) throw new Error(`Detail redirected to ${detailPath}`);
  const detailShell = page.locator("[data-opportunity-presentation]");
  await detailShell.waitFor();
  const detailPresentation = await detailShell.getAttribute("data-opportunity-presentation");
  await page.getByRole("heading", { level: 1, name: opportunity.title }).waitFor();
  await page.waitForTimeout(250);
  const sourceHref = await page.getByRole("link", { name: /Official source/ }).first().getAttribute("href");
  const detailAxe = await new AxeBuilder({ page }).analyze();
  await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-detail.png`), fullPage: true });
  const detailMetrics = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    metadataScripts: document.querySelectorAll('script[type="application/ld+json"]').length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    hasPrivateSaveAction: Boolean(document.querySelector('button[aria-label*=" privately"]')),
  }));

  results.push({
    viewport,
    browse: {
      httpStatus: browseResponse?.status() ?? null,
      presentation: browsePresentation,
      ...browseMetrics,
      seriousAxeViolations: browseAxe.violations.filter(({ impact }) => impact === "critical" || impact === "serious").map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
    detail: {
      httpStatus: detailResponse?.status() ?? null,
      presentation: detailPresentation,
      sourceMatchesApi: sourceHref === opportunity.source.url,
      ...detailMetrics,
      seriousAxeViolations: detailAxe.violations.filter(({ impact }) => impact === "critical" || impact === "serious").map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length })),
    },
    consoleErrors,
  });
  await context.close();
}

await browser.close();
const failures = results.filter((result) =>
  result.browse.httpStatus !== 200 ||
  result.detail.httpStatus !== 200 ||
  result.browse.presentation !== expectedPresentation ||
  result.detail.presentation !== expectedPresentation ||
  result.browse.horizontalOverflow ||
  result.detail.horizontalOverflow ||
  !result.detail.sourceMatchesApi ||
  !result.detail.hasPrivateSaveAction ||
  result.detail.metadataScripts < 2 ||
  result.browse.seriousAxeViolations.length > 0 ||
  result.detail.seriousAxeViolations.length > 0 ||
  result.consoleErrors.length > 0
);
const report = {
  observedAt: new Date().toISOString(),
  baseURL,
  expectedPresentation,
  authority: { total: api.total, sampledId: opportunity.id, sampledSlug: opportunity.slug, sampledTitle: opportunity.title, publicSourceKeys: sourceKeys },
  mutationBoundary: "Read-only observation. Save, Follow, Prepare, report, and application actions were not invoked.",
  results,
  passed: failures.length === 0,
};
await writeFile(path.join(outputDirectory, "observation.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
