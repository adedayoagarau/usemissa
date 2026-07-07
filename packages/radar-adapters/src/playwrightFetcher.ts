import { chromium, type Browser } from 'playwright';
import type { Fetcher, FetchResult, Source } from '@missa/radar-engine';
import { stripHtml } from '@missa/radar-engine';

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
      return { status: 'error', content: '' };
    }
    const browser = await this.ensureBrowser();
    const page = await browser.newPage({ userAgent: this.userAgent });
    try {
      const response = await page.goto(source.url, { waitUntil: 'networkidle', timeout: this.timeoutMs });
      if (!response) return { status: 'error', content: '' };
      if (response.status() === 404 || response.status() === 410) return { status: 'gone', content: '' };
      if (!response.ok()) return { status: 'error', content: '' };
      const html = await page.content();
      return { status: 'ok', content: stripHtml(html) };
    } catch {
      return { status: 'error', content: '' };
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
      const res = await globalThis.fetch(`${origin}/robots.txt`, { headers: { 'user-agent': this.userAgent } });
      if (!res.ok) return { disallow: [] };
      const text = await res.text();
      return { disallow: parseDisallowForUserAgent(text, this.userAgent) };
    } catch {
      return { disallow: [] };
    }
  }
}

interface RobotsGroup {
  agents: string[];
  disallow: string[];
}

/**
 * Minimal robots.txt parser (RFC 9309 subset): groups of consecutive
 * "User-agent" lines followed by directives; prefers a group matching our own
 * user agent, falling back to the wildcard ("*") group.
 */
export function parseDisallowForUserAgent(robotsTxt: string, userAgent: string): string[] {
  const lines = robotsTxt
    .split(/\r?\n/)
    .map((l) => l.split('#')[0].trim())
    .filter(Boolean);

  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let sawDirectiveSinceLastAgent = false;

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (!current || sawDirectiveSinceLastAgent) {
        current = { agents: [], disallow: [] };
        groups.push(current);
        sawDirectiveSinceLastAgent = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === 'disallow' && current) {
      if (value) current.disallow.push(value);
      sawDirectiveSinceLastAgent = true;
    } else if ((key === 'allow' || key === 'crawl-delay') && current) {
      sawDirectiveSinceLastAgent = true;
    }
  }

  const ua = userAgent.toLowerCase();
  const specific = groups.find((g) => g.agents.some((a) => ua.includes(a) || a.includes(ua)));
  if (specific) return specific.disallow;
  const wildcard = groups.find((g) => g.agents.includes('*'));
  return wildcard ? wildcard.disallow : [];
}
