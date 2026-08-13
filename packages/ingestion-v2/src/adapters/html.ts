import { createSnapshotId, IngestionFailure, sanitizeSourceText, sha256, type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import { classifyDestination, destinationConfig } from "../destinations.js";

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const H1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const LINK = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const META = /<meta\b([^>]*)>/gi;
const HEADING = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const USER_AGENT = "MissaIngestionV2/0.1";

function text(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&(?:nbsp|amp|mdash|ndash|quot|apos);/gi, (entity) => ({ "&nbsp;": " ", "&amp;": "&", "&mdash;": "—", "&ndash;": "–", "&quot;": "\"", "&apos;": "'" }[entity.toLowerCase()] ?? entity)).replace(/\s+/g, " ").trim();
}

function attribute(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}=["']([^"']*)["']`, "i").exec(attrs);
  return match?.[1];
}

function configuredHeading(html: string, classNames: string[]): string | undefined {
  for (const match of html.matchAll(HEADING)) {
    const classes = attribute(match[2] ?? "", "class") ?? "";
    if (classNames.some((className) => classes.split(/\s+/).includes(className))) return text(match[3] ?? "");
  }
  return undefined;
}

function descriptionMeta(html: string): string | undefined {
  for (const match of html.matchAll(META)) {
    const attrs = match[1] ?? "";
    const name = attribute(attrs, "name") ?? attribute(attrs, "property");
    if (/^(description|og:description)$/i.test(name ?? "")) {
      const content = attribute(attrs, "content");
      if (content) return text(content);
    }
  }
  return undefined;
}

function deadlineFromHtml(html: string): string | undefined {
  const visible = text(html);
  const match = /deadline\s*:?\s*((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s+\d{4})?|\d{4}-\d{2}-\d{2})/i.exec(visible);
  return match?.[1];
}

function labeledValue(html: string, labelPattern: RegExp): string | undefined {
  const pattern = /<[^>]*class=["'][^"']*field-label[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>[\s\S]{0,900}?<[^>]*class=["'][^"']*field-item[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  for (const match of html.matchAll(pattern)) if (labelPattern.test(text(match[1] ?? ""))) return text(match[2] ?? "");
  return undefined;
}

function bodyDescription(html: string): string | undefined {
  const match = /<div[^>]*class=["'][^"']*field-name-body[^"']*["'][^>]*>[\s\S]*?<[^>]*property=["']content:encoded["'][^>]*>([\s\S]*?)<\/[^>]+>/i.exec(html);
  return match?.[1] ? text(match[1]) : undefined;
}

function absoluteUrl(value: string, base: string): string | undefined {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

export function robotsAllowsPath(robots: string, path: string, userAgent = USER_AGENT): boolean {
  const groups: Array<{ agents: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; disallow: string[] } | undefined;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], disallow: [] };
      groups.push(current);
    } else if (key === "disallow" && current && value) {
      current.disallow.push(value);
    }
  }
  const wanted = userAgent.toLowerCase();
  const selected = groups.filter((group) => group.agents.some((agent) => agent === "*" || wanted.includes(agent)));
  return !selected.some((group) => group.disallow.some((rule) => path.startsWith(rule)));
}

async function assertRobotsAllowed(sourceUrl: string): Promise<void> {
  const url = new URL(sourceUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  const response = await fetch(robotsUrl, {
    headers: { accept: "text/plain", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404 || response.status === 410) return;
  if (!response.ok) throw new Error(`robots preflight failed with HTTP ${response.status}`);
  if (!robotsAllowsPath(await response.text(), url.pathname)) throw new Error(`robots.txt disallows ${url.pathname}`);
}

export class GenericHtmlAdapter implements SourceAdapter {
  readonly id = "generic-html-v2";

  canHandle(source: { kind: string }): boolean {
    return source.kind === "organization-website" || source.kind === "directory" || source.kind === "profile";
  }

  async fetch(context: AdapterContext): Promise<PageSnapshot> {
    await assertRobotsAllowed(context.source.url);
    const response = await fetch(context.source.url, {
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": `${USER_AGENT} (+https://www.usemissa.com)` },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const html = sanitizeSourceText(await response.text());
    if (!response.ok) throw new IngestionFailure(response.status === 403 || response.status === 429 ? "blocked" : response.status === 404 ? "not-found" : "invalid-content", `HTML source HTTP ${response.status}`);
    return {
      id: createSnapshotId(context.run.id, context.source.url), runId: context.run.id, sourceId: context.source.id,
      url: context.source.url, finalUrl: response.url || context.source.url, fetchedAt: new Date().toISOString(),
      statusCode: response.status, contentType: response.headers.get("content-type"), contentHash: sha256(html),
      html, rendered: false,
    };
  }

  async extract(context: AdapterContext, snapshot: PageSnapshot): Promise<ExtractionResult> {
    const fields = [];
    const config = destinationConfig(context.source);
    const pageMarker = text(TITLE.exec(snapshot.html)?.[1] ?? "") + " " + text(H1.exec(snapshot.html)?.[1] ?? "");
    const softNotFound = /(?:page\s+not\s+found|404\s+error|content\s+not\s+available)/i.test(pageMarker);
    const antiBotChallenge = /(?:javascript\s+required|enable\s+javascript|checking\s+your\s+browser|cloudflare\s+challenge|captcha)/i.test(pageMarker);
    const extractionConfig = (context.source.config.extraction as { titleClassNames?: string[] } | undefined) ?? {};
    const heading = configuredHeading(snapshot.html, extractionConfig.titleClassNames ?? []) ?? H1.exec(snapshot.html)?.[1] ?? TITLE.exec(snapshot.html)?.[1];
    if (heading && config.pageRole !== "landing" && !softNotFound && !antiBotChallenge) fields.push({ fieldName: "title", rawValue: text(heading), normalizedValue: text(heading), confidence: H1.test(snapshot.html) ? 0.72 : 0.45, provenance: { adapterId: this.id, method: "html-heading", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
    if (config.pageRole !== "landing" && !softNotFound && !antiBotChallenge) {
      const description = descriptionMeta(snapshot.html);
      const fullDescription = bodyDescription(snapshot.html) ?? description;
      if (fullDescription) fields.push({ fieldName: "description", rawValue: fullDescription, normalizedValue: fullDescription, confidence: bodyDescription(snapshot.html) ? 0.86 : 0.68, provenance: { adapterId: this.id, method: bodyDescription(snapshot.html) ? "html-body-field" : "html-meta-description", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const deadline = deadlineFromHtml(snapshot.html);
      if (deadline) fields.push({ fieldName: "deadline", rawValue: deadline, normalizedValue: deadline, confidence: 0.58, provenance: { adapterId: this.id, method: "html-deadline-label", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const entryFee = labeledValue(snapshot.html, /entry\s+fee/i);
      if (entryFee) fields.push({ fieldName: "entry_fee", rawValue: entryFee, normalizedValue: entryFee, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const cashPrize = labeledValue(snapshot.html, /cash\s+prize|prize/i);
      if (cashPrize) fields.push({ fieldName: "cash_prize", rawValue: cashPrize, normalizedValue: cashPrize, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const contactEmail = labeledValue(snapshot.html, /e-?mail|email/i);
      if (contactEmail) fields.push({ fieldName: "contact_email", rawValue: contactEmail, normalizedValue: contactEmail, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const officialWebsite = labeledValue(snapshot.html, /website|official\s+site/i);
      if (officialWebsite) fields.push({ fieldName: "official_website", rawValue: officialWebsite, normalizedValue: officialWebsite, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
    }
    const candidateLinks = [];
    const seenUrls = new Set<string>();
    for (const match of snapshot.html.matchAll(LINK)) {
      const url = absoluteUrl(match[1]!, snapshot.finalUrl);
      const label = text(match[2] ?? "");
      if (!url || url === snapshot.finalUrl || url === context.source.url) continue;
      if ((match[1] ?? "").includes("&#")) continue;
      const candidate = classifyDestination(url, label, config);
      if (candidate.role === "apply" && new URL(url).pathname === "/") continue;
      if (candidate.role === "detail" && new URL(url).pathname.endsWith("/") && new URL(url).pathname.split("/").filter(Boolean).length <= 1) continue;
      if (seenUrls.has(url)) continue;
      const explicitDestination = candidate.role === "detail" || candidate.role === "apply" || candidate.role === "feed";
      const heuristicDestination = !config.rules?.length && /apply|submit|deadline|opportunit|grant|award|contest|residen|fellowship|open[- ]?call|read more/i.test(`${url} ${label}`);
      if (explicitDestination || heuristicDestination) {
        seenUrls.add(url);
        candidateLinks.push(candidate);
      }
      if (candidateLinks.length >= (config.detailLimit ?? 100)) break;
    }
    const warnings = antiBotChallenge ? ["Content indicates an anti-bot or JavaScript challenge"] : softNotFound ? ["Content indicates page not found despite a successful HTTP response"] : fields.length ? [] : [config.pageRole === "landing" ? "Landing page is not an opportunity; detail destinations must be fetched" : "No title-like heading found"];
    return { fields, candidateLinks, warnings };
  }
}

export function createBenchmarkSources(adapterId = "generic-html-v2") {
  return [
    { id: "benchmark-pw-grants", name: "Poets & Writers Grants", url: "https://www.pw.org/grants", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "contest", "award"], config: { comparisonAdapter: "gary", garySourceId: "pw.org", garyTargetUrl: "https://www.pw.org/writing_contests/other_futures_award", extraction: { titleClassNames: ["grant-listing-title"] }, destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["/writing_contests/", "read more"], authority: "destination" }, { role: "apply", patterns: ["submit", "apply"], authority: "destination" }] } } },
    { id: "benchmark-nyfa-opportunities", name: "NYFA Opportunities", url: "https://www.nyfa.org/awards-grants/", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "fellowship", "award"], config: { comparisonAdapter: "radar", legacyUrls: ["https://www.nyfa.org/grant-discipline/visual-arts/", "https://www.nyfa.org/Content/Show/Opportunities"], destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["/awards-grants/"], authority: "destination" }, { role: "apply", patterns: ["apply", "submit"], authority: "destination" }] } } },
    { id: "benchmark-grants-gov-arts", name: "Grants.gov Arts Opportunities API", url: "https://api.grants.gov/v1/api/search2", adapterId: "json-api-v2", kind: "api" as const, geography: ["US"], opportunityTypes: ["grant", "award"], config: { transport: "json", comparisonAdapter: "none", recordPath: "data.oppHits", fieldMap: { id: "id", title: "title", organization: ["agency", "agencyName"], deadline: "closeDate" }, request: { method: "POST", body: { rows: 5, keyword: "arts", oppStatuses: "forecasted|posted", fundingCategories: "AR" } }, detailRequest: { url: "https://api.grants.gov/v1/api/fetchOpportunity", method: "POST", bodyField: "opportunityId" }, destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["fetchOpportunity"], authority: "destination" }] } } },
    { id: "benchmark-creative-capital", name: "Creative Capital Artist Opportunities", url: "https://creative-capital.org/artist-resources/artist-opportunities/", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "fellowship", "residency", "open-call"], config: { comparisonAdapter: "radar", legacyUrls: ["https://creative-capital.org/opportunities/"], destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["?opportunity", "artist-opportunities", "opportunit"], authority: "destination" }, { role: "apply", patterns: ["apply", "submit"], authority: "destination" }] } } },
  ];
}
