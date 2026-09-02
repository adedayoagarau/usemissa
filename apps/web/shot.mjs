import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3047/design-system/homepage-future?access=open", { waitUntil: "networkidle" });
await page.getByRole("region", { name: 'Every application, from discovery to response.' }).scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator("section[aria-labelledby='tracker-board-heading']").screenshot({ path: "/tmp/tracker-board.png" });
await page.screenshot({ path: "/tmp/full-page.png", fullPage: true });
await browser.close();
