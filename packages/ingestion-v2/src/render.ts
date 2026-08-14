import type { PageSnapshot } from "./contracts.js";

/**
 * Rendering costs roughly two orders of magnitude more than a static fetch, so
 * it is an escalation, never the default. A page earns a render only when the
 * static response cannot answer the question we are asking of it.
 */

const CHALLENGE = /(?:javascript\s+required|enable\s+javascript|checking\s+your\s+browser|cloudflare|captcha|please\s+wait|loading\b)/i;
const APP_SHELL = /<div[^>]+id=["'](?:root|app|__next|__nuxt|svelte)["']/i;
const NOSCRIPT_HINT = /<noscript>[\s\S]{0,400}?(?:enable|requires?)\s+javascript/i;

function visibleTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

export interface RenderDecision {
  render: boolean;
  reason: string;
}

/**
 * `extractedFieldCount` matters as much as the markup: a thin page that still
 * yielded a title and a deadline does not need a browser.
 */
export function shouldRender(snapshot: Pick<PageSnapshot, "html" | "contentType">, extractedFieldCount = 0): RenderDecision {
  if (snapshot.contentType && !/html|xml/i.test(snapshot.contentType)) return { render: false, reason: "response is not markup" };
  const html = snapshot.html;
  const textLength = visibleTextLength(html);

  if (NOSCRIPT_HINT.test(html)) return { render: true, reason: "the page states that JavaScript is required" };
  if (textLength < 500 && APP_SHELL.test(html)) return { render: true, reason: "the response is an empty application shell" };
  if (textLength < 200) return { render: true, reason: "the response carries almost no visible text" };
  if (extractedFieldCount === 0 && CHALLENGE.test(html.slice(0, 4_000))) return { render: true, reason: "the response looks like an interstitial or challenge" };
  return { render: false, reason: "the static response is already readable" };
}

export interface RenderClientOptions {
  endpoint: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RenderedPage {
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  html: string;
}

export class RenderClient {
  constructor(private readonly options: RenderClientOptions) {}

  async render(url: string): Promise<RenderedPage> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(this.options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.options.token}` },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 30_000),
    });
    if (!response.ok) throw new Error(`Render service returned HTTP ${response.status}`);
    const body = await response.json() as RenderedPage;
    if (typeof body.html !== "string") throw new Error("Render service returned no document");
    return body;
  }
}

export function createRenderClient(env: NodeJS.ProcessEnv = process.env): RenderClient | undefined {
  const endpoint = env.RENDER_SERVICE_URL;
  const token = env.RENDER_SERVICE_TOKEN;
  if (!endpoint && !token) return undefined;
  if (!endpoint || !token) throw new Error("Rendering needs RENDER_SERVICE_URL and RENDER_SERVICE_TOKEN together");
  return new RenderClient({ endpoint: endpoint.replace(/\/$/, "").endsWith("/render") ? endpoint : `${endpoint.replace(/\/$/, "")}/render`, token });
}

/**
 * Escalates a static snapshot to a rendered one. Rendering failures return the
 * original snapshot: a slow or missing renderer must degrade coverage, never
 * fail a run that already has a usable static response.
 */
export async function renderIfNeeded(
  snapshot: PageSnapshot,
  client: RenderClient | undefined,
  extractedFieldCount = 0,
  logger: Pick<Console, "warn"> = console,
): Promise<{ snapshot: PageSnapshot; rendered: boolean; reason: string }> {
  const decision = shouldRender(snapshot, extractedFieldCount);
  if (!decision.render) return { snapshot, rendered: false, reason: decision.reason };
  if (!client) return { snapshot, rendered: false, reason: `${decision.reason}; no render service is configured` };
  try {
    const page = await client.render(snapshot.finalUrl || snapshot.url);
    return {
      snapshot: { ...snapshot, finalUrl: page.finalUrl || snapshot.finalUrl, statusCode: page.statusCode || snapshot.statusCode, contentType: page.contentType ?? snapshot.contentType, html: page.html, rendered: true },
      rendered: true,
      reason: decision.reason,
    };
  } catch (error) {
    logger.warn(`[missa-ingestion-v2] render failed for ${snapshot.url}: ${error instanceof Error ? error.message : String(error)}`);
    return { snapshot, rendered: false, reason: `render failed: ${decision.reason}` };
  }
}
