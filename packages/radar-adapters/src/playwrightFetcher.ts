import { chromium, type Browser } from 'playwright';
import type { Fetcher, FetchResult, Source } from '@missa/radar-engine';
import { stripHtml } from '@missa/radar-engine';
import { parseDisallowForUserAgent } from './sourcePolicy.js';
export { parseDisallowForUserAgent } from './sourcePolicy.js';

export interface PlaywrightFetcherOptions {
  userAgent?: string;
  /** Max time to wait for a page to settle before giving up. */
  timeoutMs?: number;
  /** Respect robots.txt — on by default; the strategy doc requires it. */
  respectRobotsTxt?: boolean;
}

interface RobotsRule {
  disallow: string[];
}

/**
 * Production Fetcher: renders JS-heavy submission pages with a real browser
 * instead of the plain-HTTP `HttpFetcher`. Same `Fetcher` port, so the engine
 * doesn't change — only `RadarEngineOptions.fetcher` at wiring time.
 *
 * Launches one shared browser and a fresh page per fetch; call `close()` on
 * shutdown. Robots.txt is checked per-origin and cached for the process
 * lifetime — this is a lightweight disallow-prefix check, not a full parser.
 */
export class PlaywrightFetcher implements Fetcher {
  private browser?: Browser;
  private readonly robotsCache = new Map<string, RobotsRule>();
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly respectRobotsTxt: boolean;

  constructor(opts: PlaywrightFetcherOptions = {}) {
    this.userAgent = opts.userAgent ?? 'MissaRadar/0.1 (+https://usemissa.com/radar)';
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.respectRobotsTxt = opts.respectRobotsTxt ?? true;
  }

  async fetch(source: Source): Promise<FetchResult> {
    if (this.respectRobotsTxt && !(await this.isAllowed(source.url))) {
      return { status: 'error', content: '', failureReason: 'robots-blocked' };
    }
    const browser = await this.ensureBrowser();
    const page = await browser.newPage({ userAgent: this.userAgent });
    try {
      const response = await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: this.timeoutMs });
      if (!response) return { status: 'error', content: '', failureReason: 'empty-response' };
      if (response.status() === 404 || response.status() === 410) return { status: 'gone', content: '' };
      if (!response.ok()) return { status: 'error', content: '', failureReason: `http-${response.status()}` };
      await page.waitForLoadState('networkidle', { timeout: Math.min(this.timeoutMs, 2_000) }).catch(() => undefined);
      const html = await page.content();
      return { status: 'ok', content: stripHtml(html) };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      return { status: 'error', content: '', failureReason: message.includes('timeout') ? 'timeout' : 'network' };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = undefined;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) this.browser = await chromium.launch({ headless: true });
    return this.browser;
  }

  private async isAllowed(url: string): Promise<boolean> {
    const origin = new URL(url).origin;
    let rule = this.robotsCache.get(origin);
    if (!rule) {
      rule = await this.fetchRobots(origin);
      this.robotsCache.set(origin, rule);
    }
    const path = new URL(url).pathname;
    return !rule.disallow.some((prefix) => path.startsWith(prefix));
  }

  private async fetchRobots(origin: string): Promise<RobotsRule> {
    try {
      const res = await globalThis.fetch(`${origin}/robots.txt`, { headers: { 'user-agent': this.userAgent }, signal: AbortSignal.timeout(5_000) });
      if (!res.ok) return { disallow: [] };
      const text = await res.text();
      return { disallow: parseDisallowForUserAgent(text, this.userAgent) };
    } catch {
      return { disallow: [] };
    }
  }
}
