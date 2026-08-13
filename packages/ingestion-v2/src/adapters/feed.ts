import { createSnapshotId, IngestionFailure, sanitizeSourceText, sha256, type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import { classifyDestination, destinationConfig } from "../destinations.js";

const TAG = (name: string) => new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
function clean(value: string): string { return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
function links(value: string, base: string): string | undefined { try { const u = new URL(value, base); return /^https?:$/.test(u.protocol) ? u.href : undefined; } catch { return undefined; } }

/** Extracts RSS/Atom entries while preserving each entry's source URL as authority. */
export class FeedAdapter implements SourceAdapter {
  readonly id = "feed-v2";
  canHandle(source: { kind: string; config: Record<string, unknown> }): boolean { return source.kind === "feed" || source.config.transport === "rss" || source.config.transport === "atom"; }
  async fetch(context: AdapterContext): Promise<PageSnapshot> {
    const response = await fetch(context.source.url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "user-agent": "MissaIngestionV2/0.1" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const body = sanitizeSourceText(await response.text());
    if (!response.ok) throw new IngestionFailure(response.status === 403 || response.status === 429 ? "blocked" : response.status === 404 ? "not-found" : "invalid-content", `Feed source HTTP ${response.status}`);
    return { id: createSnapshotId(context.run.id, context.source.url), runId: context.run.id, sourceId: context.source.id, url: context.source.url, finalUrl: response.url || context.source.url, fetchedAt: new Date().toISOString(), statusCode: response.status, contentType: response.headers.get("content-type"), contentHash: sha256(body), html: body, rendered: false };
  }
  async extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult> {
    const fields: ExtractionResult["fields"] = [];
    const candidateLinks: ExtractionResult["candidateLinks"] = [];
    const entryPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    for (const match of snapshot.html.matchAll(entryPattern)) {
      const body = match[2] ?? "";
      const title = clean(body.match(TAG("title"))?.[1] ?? "");
      const rawLink = body.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? body.match(TAG("link"))?.[1] ?? "";
      const url = links(clean(rawLink), snapshot.finalUrl);
      if (!url) continue;
      const destination = classifyDestination(url, title, destinationConfig(context.source));
      candidateLinks.push({ ...destination, role: destination.role === "unknown" ? "detail" : destination.role, authority: "destination" });
      if (title) fields.push({ fieldName: "title", rawValue: title, normalizedValue: title, confidence: 0.82, provenance: { adapterId: this.id, method: "feed-entry-title", sourceUrl: url, snapshotId: snapshot.id } });
      const description = clean(body.match(TAG("description"))?.[1] ?? body.match(TAG("summary"))?.[1] ?? "");
      if (description) fields.push({ fieldName: "description", rawValue: description, normalizedValue: description, confidence: 0.7, provenance: { adapterId: this.id, method: "feed-entry-description", sourceUrl: url, snapshotId: snapshot.id } });
      const date = clean(body.match(TAG("pubDate"))?.[1] ?? body.match(TAG("updated"))?.[1] ?? body.match(TAG("published"))?.[1] ?? "");
      if (date) fields.push({ fieldName: "publishedAt", rawValue: date, normalizedValue: date, confidence: 0.75, provenance: { adapterId: this.id, method: "feed-entry-date", sourceUrl: url, snapshotId: snapshot.id } });
    }
    return { fields, candidateLinks, warnings: candidateLinks.length ? [] : ["Feed contained no parseable item or entry links"] };
  }
}
