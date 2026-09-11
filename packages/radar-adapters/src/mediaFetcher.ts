import { createHash } from "node:crypto";
import { parseCrawlDelayForUserAgent, robotsAllowsPath } from "./sourcePolicy.js";

export const USER_AGENT = "MissaRadar/1.0 (+https://www.usemissa.com; media-enrichment; evidence-only)";

export interface FetchResult {
  body: string | Buffer;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  contentLength?: number;
  contentHash: string;
  redirectChain: string[];
  etag?: string;
  lastModified?: string;
}

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  expectedType?: "html" | "image";
  etag?: string;
  lastModified?: string;
  checkRobots?: boolean;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_HTML_BYTES = 2_000_000;
const DEFAULT_MAX_IMAGE_BYTES = 10_000_000;

// Domain rate-limiting state
const domainLastRequestAt = new Map<string, number>();
const robotsCache = new Map<string, Promise<string | null>>();

async function getRobotsTxt(origin: string, timeoutMs: number): Promise<string | null> {
  let pending = robotsCache.get(origin);
  if (!pending) {
    pending = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 4_000));
        const res = await fetch(`${origin}/robots.txt`, {
          headers: { "user-agent": USER_AGENT },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) return await res.text();
        return null;
      } catch {
        return null;
      }
    })();
    robotsCache.set(origin, pending);
  }
  return pending;
}

export async function respectDomainRateLimit(origin: string, crawlDelaySeconds?: number): Promise<void> {
  const minDelayMs = crawlDelaySeconds ? Math.min(10_000, crawlDelaySeconds * 1_000) : 250;
  const lastAt = domainLastRequestAt.get(origin) ?? 0;
  const now = Date.now();
  const elapsed = now - lastAt;
  if (elapsed < minDelayMs) {
    await new Promise((resolve) => setTimeout(resolve, minDelayMs - elapsed));
  }
  domainLastRequestAt.set(origin, Date.now());
}

export async function fetchWithPolicy(
  targetUrl: string,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // 1. Robots.txt policy check
  if (options.checkRobots !== false) {
    const robotsTxt = await getRobotsTxt(origin, timeoutMs);
    if (robotsTxt) {
      if (!robotsAllowsPath(robotsTxt, parsed.pathname, USER_AGENT)) {
        throw new Error("robots-blocked");
      }
      const crawlDelay = parseCrawlDelayForUserAgent(robotsTxt, USER_AGENT);
      await respectDomainRateLimit(origin, crawlDelay);
    } else {
      await respectDomainRateLimit(origin);
    }
  }

  // 2. Setup request headers
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
  };
  if (options.expectedType === "image") {
    headers.accept = "image/webp,image/avif,image/jpeg,image/png,image/*;q=0.8";
  } else {
    headers.accept = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8";
  }
  if (options.etag) headers["if-none-match"] = options.etag;
  if (options.lastModified) headers["if-modified-since"] = options.lastModified;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const redirectChain: string[] = [targetUrl];

  try {
    const response = await fetch(targetUrl, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    if (response.url && response.url !== targetUrl) {
      redirectChain.push(response.url);
    }

    if (response.status === 304) {
      return {
        body: "",
        finalUrl: response.url || targetUrl,
        httpStatus: 304,
        contentType: response.headers.get("content-type") ?? "",
        contentHash: "",
        redirectChain,
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
    const maxBytes = options.maxBytes ?? (options.expectedType === "image" ? DEFAULT_MAX_IMAGE_BYTES : DEFAULT_MAX_HTML_BYTES);

    if (contentLength && contentLength > maxBytes) {
      throw new Error(`oversized-content: length ${contentLength} exceeds ${maxBytes}`);
    }

    if (options.expectedType === "html") {
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new Error(`unsupported-content-type: expected html, got ${contentType || "unknown"}`);
      }
      const text = (await response.text()).slice(0, maxBytes);
      const hash = createHash("sha256").update(text).digest("hex");
      return {
        body: text,
        finalUrl: response.url || targetUrl,
        httpStatus: response.status,
        contentType,
        contentLength: Buffer.byteLength(text),
        contentHash: hash,
        redirectChain,
        etag: response.headers.get("etag") ?? undefined,
        lastModified: response.headers.get("last-modified") ?? undefined,
      };
    }

    if (options.expectedType === "image") {
      if (!contentType.startsWith("image/")) {
        throw new Error(`unsupported-content-type: expected image, got ${contentType || "unknown"}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxBytes) {
        throw new Error(`oversized-content: downloaded ${arrayBuffer.byteLength} exceeds ${maxBytes}`);
      }
      const buffer = Buffer.from(arrayBuffer);
      const hash = createHash("sha256").update(buffer).digest("hex");
      return {
        body: buffer,
        finalUrl: response.url || targetUrl,
        httpStatus: response.status,
        contentType,
        contentLength: buffer.length,
        contentHash: hash,
        redirectChain,
        etag: response.headers.get("etag") ?? undefined,
        lastModified: response.headers.get("last-modified") ?? undefined,
      };
    }

    const raw = await response.text();
    const hash = createHash("sha256").update(raw).digest("hex");
    return {
      body: raw.slice(0, maxBytes),
      finalUrl: response.url || targetUrl,
      httpStatus: response.status,
      contentType,
      contentLength: raw.length,
      contentHash: hash,
      redirectChain,
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}
