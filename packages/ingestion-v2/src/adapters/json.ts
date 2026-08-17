import { createSnapshotId, IngestionFailure, sanitizeSourceText, sha256, type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import { classifyDestination, destinationConfig, type DestinationRequest } from "../destinations.js";

function stringValue(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function records(value: unknown, recordPath?: string): Record<string, unknown>[] {
  if (recordPath) {
    const selected = readPath(value, recordPath);
    if (selected !== undefined) return records(selected);
  }
  if (Array.isArray(value)) return value.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["items", "results", "opportunities", "oppHits"]) if (Array.isArray(o[key])) return records(o[key]);
    if (o.data && typeof o.data === "object") {
      const nested = records(o.data);
      if (nested.length) return nested;
      return [o.data as Record<string, unknown>];
    }
    if (stringValue(o.id) || stringValue(o.opportunityId) || stringValue(o.title) || stringValue(o.opportunityTitle)) return [o];
  }
  return [];
}

function requestFor(source: AdapterContext["source"]): DestinationRequest {
  const configured = source.config.request;
  if (!configured || typeof configured !== "object") return { method: "GET" };
  const request = configured as Partial<DestinationRequest>;
  return { method: request.method === "POST" ? "POST" : "GET", ...(request.body === undefined ? {} : { body: request.body }), ...(request.headers ? { headers: request.headers } : {}) };
}

function mappedValue(item: Record<string, unknown>, fieldName: string, fallbackPaths: string[]): string | undefined {
  const fieldMap = item.__fieldMap as Record<string, string | string[]> | undefined;
  const configured = fieldMap?.[fieldName];
  const paths = configured ? (Array.isArray(configured) ? configured : [configured]) : fallbackPaths;
  for (const path of paths) {
    const value = stringValue(readPath(item, path));
    if (value) return value;
  }
  return undefined;
}

function resolveTemplate(value: unknown, id: string): unknown {
  if (typeof value === "string") return value.replaceAll("{{id}}", id);
  if (Array.isArray(value)) return value.map((entry) => resolveTemplate(entry, id));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveTemplate(entry, id)]));
  return value;
}

/** Handles common JSON listing/API envelopes without inventing a provider-specific schema. */
export class JsonApiAdapter implements SourceAdapter {
  readonly id = "json-api-v2";
  canHandle(source: { kind: string; config: Record<string, unknown> }): boolean { return source.kind === "api" || source.config.transport === "json"; }
  async fetch(context: AdapterContext): Promise<PageSnapshot> {
    const request = requestFor(context.source);
    const headers = { accept: "application/json", "user-agent": "MissaIngestionV2/0.1", ...(request.body === undefined ? {} : { "content-type": "application/json" }), ...(request.headers ?? {}) };
    const response = await fetch(context.source.url, { method: request.method, ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }), headers, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    const body = sanitizeSourceText(await response.text());
    if (!response.ok) throw new IngestionFailure(response.status === 403 || response.status === 429 ? "blocked" : response.status === 404 ? "not-found" : "invalid-content", `JSON source HTTP ${response.status}`);
    return { id: createSnapshotId(context.run.id, context.source.url, JSON.stringify(request)), runId: context.run.id, sourceId: context.source.id, url: context.source.url, finalUrl: response.url || context.source.url, fetchedAt: new Date().toISOString(), statusCode: response.status, contentType: response.headers.get("content-type"), contentHash: sha256(body), html: body, rendered: false };
  }
  async extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult> {
    let parsed: unknown;
    try { parsed = JSON.parse(snapshot.html); } catch { return { fields: [], candidateLinks: [], warnings: ["JSON response was not valid JSON"] }; }
    const fields: ExtractionResult["fields"] = [];
    const candidateLinks: ExtractionResult["candidateLinks"] = [];
    const config = context.source.config;
    const configuredDetail = config.detailRequest;
    const detailRequest = configuredDetail && typeof configuredDetail === "object" ? configuredDetail as {
      url?: string;
      method?: "GET" | "POST";
      bodyField?: string;
      bodyTemplate?: unknown;
      headers?: Record<string, string>;
      canonicalUrlTemplate?: string;
      detailRecordPath?: string;
      detailFieldMap?: Record<string, string | string[]>;
    } : undefined;
    const isDetail = destinationConfig(context.source).pageRole === "detail";
    const fieldMap = isDetail && detailRequest?.detailFieldMap
      ? detailRequest.detailFieldMap
      : config.fieldMap && typeof config.fieldMap === "object"
        ? config.fieldMap as Record<string, string | string[]>
        : undefined;
    const recordPath = isDetail && detailRequest?.detailRecordPath
      ? detailRequest.detailRecordPath
      : typeof config.recordPath === "string"
        ? config.recordPath
        : undefined;
    const configuredCanonicalUrl = stringValue(config.canonicalUrl);
    for (const rawItem of records(parsed, recordPath)) {
      const item = fieldMap ? { ...rawItem, __fieldMap: fieldMap } : rawItem;
      const itemId = mappedValue(item, "id", ["id", "opportunityId", "opportunityNumber"]);
      const fetchUrl = mappedValue(item, "url", ["url", "link", "applicationUrl", "applyUrl"]) ?? (detailRequest?.url && itemId ? detailRequest.url : undefined);
      const canonicalUrl = configuredCanonicalUrl ?? (detailRequest?.canonicalUrlTemplate && itemId ? stringValue(resolveTemplate(detailRequest.canonicalUrlTemplate, itemId)) : undefined);
      const evidenceUrl = canonicalUrl ?? fetchUrl ?? snapshot.finalUrl ?? snapshot.url;
      if (!isDetail && !fetchUrl) continue;
      const title = mappedValue(item, "title", ["title", "name", "opportunityTitle"]);
      if (!isDetail && fetchUrl) {
        const destination = classifyDestination(fetchUrl, title ?? "", destinationConfig(context.source));
        const request = detailRequest && itemId ? { method: detailRequest.method === "GET" ? "GET" as const : "POST" as const, body: detailRequest.bodyTemplate === undefined ? (detailRequest.bodyField ? { [detailRequest.bodyField]: itemId } : { opportunityId: itemId }) : resolveTemplate(detailRequest.bodyTemplate, itemId), ...(detailRequest.headers ? { headers: detailRequest.headers } : {}) } : undefined;
        candidateLinks.push({ ...destination, role: destination.role === "unknown" ? "detail" : destination.role, authority: "destination", ...(itemId ? { stableId: itemId } : {}), ...(canonicalUrl ? { canonicalUrl } : {}), ...(request ? { request } : {}) });
      }
      for (const [name, value] of [["title", title], ["organization", mappedValue(item, "organization", ["organization", "organizer", "agency", "agencyName"])], ["description", mappedValue(item, "description", ["description", "summary", "synopsis"])], ["deadline", mappedValue(item, "deadline", ["deadline", "deadlineDate", "closeDate", "originalDueDate"])], ["openDate", mappedValue(item, "openDate", ["openDate"])] ] as const) {
        if (value) fields.push({ fieldName: name, rawValue: value, normalizedValue: value, confidence: 0.8, provenance: { adapterId: this.id, method: `json-${name}`, sourceUrl: evidenceUrl, snapshotId: snapshot.id, ...(itemId ? { recordId: itemId } : {}) } });
      }
    }
    return { fields, candidateLinks, warnings: fields.length || candidateLinks.length ? [] : ["JSON response contained no extractable opportunity records"] };
  }
}
