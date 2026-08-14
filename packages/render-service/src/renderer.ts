import { chromium, type Browser } from "playwright";
import { assessRenderUrl } from "./policy.js";

export interface RenderResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  html: string;
  rendered: true;
}

export interface RendererOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

const DEFAULT_USER_AGENT = "MissaIngestionV2/0.1 (+https://www.usemissa.com; rendering)";

/**
 * One shared browser, one fresh context per request. A context per request keeps
 * cookies and storage from leaking between organizations; a shared browser keeps
 * us from paying Chromium's start-up cost on every page.
 */
export class Renderer {
  private browser?: Browser;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;

  constructor(options: RendererOptions = {}) {
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.maxBytes = options.maxBytes ?? 5_000_000;
  }

  async render(target: string): Promise<RenderResult> {
    const decision = assessRenderUrl(target);
    if (!decision.allowed) throw Object.assign(new Error(decision.reason), { statusCode: 400 });

    const browser = await this.browser0();
    const context = await browser.newContext({ userAgent: this.userAgent, javaScriptEnabled: true });
    const page = await context.newPage();
    // Images and fonts cost time and bytes and never carry the text we extract.
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      return type === "image" || type === "media" || type === "font" ? route.abort() : route.continue();
    });
    try {
      const response = await page.goto(decision.url.href, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      if (!response) throw Object.assign(new Error("The page returned no response"), { statusCode: 502 });
      await page.waitForLoadState("networkidle", { timeout: Math.min(this.timeoutMs, 3_000) }).catch(() => undefined);
      const html = await page.content();
      if (html.length > this.maxBytes) throw Object.assign(new Error("The rendered document exceeded the size limit"), { statusCode: 413 });
      return {
        url: decision.url.href,
        finalUrl: page.url(),
        statusCode: response.status(),
        contentType: response.headers()["content-type"] ?? null,
        html,
        rendered: true,
      };
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = undefined;
  }

  private async browser0(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    }
    return this.browser;
  }
}
