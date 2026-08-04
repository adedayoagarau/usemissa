import type { Fetcher, FetchResult } from '../ports.js';
import type { Source } from '../domain/types.js';

/**
 * Fixture fetcher for tests and the demo: pages are keyed by URL and can be
 * mutated between ticks to simulate the live web (deadline extended, call
 * closed, page gone, ...).
 */
export class FixtureFetcher implements Fetcher {
  private pages = new Map<string, string>();
  private gone = new Set<string>();

  setPage(url: string, content: string): void {
    this.pages.set(url, content);
    this.gone.delete(url);
  }

  removePage(url: string): void {
    this.pages.delete(url);
    this.gone.add(url);
  }

  async fetch(source: Source): Promise<FetchResult> {
    if (this.gone.has(source.url)) return { status: 'gone', content: '' };
    const content = this.pages.get(source.url);
    if (content === undefined) return { status: 'error', content: '' };
    return { status: 'ok', content };
  }
}

/**
 * Minimal HTTP fetcher for live sources. Production replaces this with
 * Crawlee + Playwright behind the same port; both must respect robots.txt
 * and source terms (RFC 9309).
 */
export class HttpFetcher implements Fetcher {
  constructor(private readonly userAgent = 'MissaRadar/0.1 (+https://usemissa.com/radar)') {}

  async fetch(source: Source): Promise<FetchResult> {
    try {
      const res = await globalThis.fetch(source.url, {
        headers: { 'user-agent': this.userAgent },
        redirect: 'follow',
        signal: AbortSignal.timeout(fetchTimeoutMs()),
      });
      if (res.status === 404 || res.status === 410) return { status: 'gone', content: '' };
      if (!res.ok) return { status: 'error', content: '' };
      // A source URL can point at an image, PDF, or another binary asset. Do
      // not decode those bytes as text: binary payloads can contain NULs and
      // other control characters that cannot be persisted in Postgres JSON,
      // and they are not useful to the opportunity extractor anyway.
      const contentType = res.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
      if (contentType && !isTextualContentType(contentType)) return { status: 'error', content: '' };
      const raw = await res.text();
      if (!isSafeTextPayload(raw)) return { status: 'error', content: '' };
      return { status: 'ok', content: stripHtml(raw) };
    } catch {
      return { status: 'error', content: '' };
    }
  }
}

const DEFAULT_FETCH_TIMEOUT_MS = 20_000;
const MAX_FETCH_TIMEOUT_MS = 60_000;

function fetchTimeoutMs(): number {
  const configured = Number(process.env.RADAR_FETCH_TIMEOUT_MS);
  if (!Number.isInteger(configured) || configured < 5_000) return DEFAULT_FETCH_TIMEOUT_MS;
  return Math.min(configured, MAX_FETCH_TIMEOUT_MS);
}

function isTextualContentType(contentType: string): boolean {
  return contentType.startsWith('text/') || [
    'application/xhtml+xml',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/json',
  ].includes(contentType);
}

/** Reject decoded binary/control payloads before they reach snapshots/JSON. */
export function isSafeTextPayload(value: string): boolean {
  return !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

/** Crude HTML→text so the deterministic extractor sees prose, not markup. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
