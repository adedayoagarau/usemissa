import { createSnapshotId, IngestionFailure, sanitizeSourceText, sha256, type AdapterContext, type ExtractionResult, type PageSnapshot, type SourceAdapter } from "../contracts.js";
import { classifyDestination, destinationConfig, type DestinationCandidate } from "../destinations.js";

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const H1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const LINK = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const OPENING_LINK = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
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
  const monthPattern = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const datePattern = `${monthPattern}\\s+\\d{1,2}(?:,?\\s+\\d{4})?|\\d{1,2}\\s+${monthPattern}\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/. -]\\d{1,2}[/. -]\\d{4}`;
  const deadlineKind = "(?:final|submission|submissions|application)";
  const match =
    new RegExp(`(${datePattern})\\s+${deadlineKind}\\s+deadline`, "i").exec(visible) ??
    new RegExp(`${deadlineKind}\\s+deadline\\s*:?\\s*(${datePattern})`, "i").exec(visible) ??
    new RegExp(`deadline\\s*:?\\s*(${datePattern})`, "i").exec(visible) ??
    new RegExp(`deadline[^.!?]{0,100}?\\b(${datePattern})`, "i").exec(visible);
  const value = match?.[1];
  if (!value) return undefined;
  const numeric = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(value);
  if (!numeric) return value;
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  if (first <= 12 || second > 12) return undefined;
  return `${numeric[3]}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
}

function deadlineValuesFromHtml(html: string): string[] {
  const visible = text(html);
  const month = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const date = `${month}\\s+\\d{1,2}(?:,?\\s+\\d{4})?|\\d{1,2}\\s+${month}\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}`;
  const phase = "(?:early(?: bird)?|regular|standard|final|submission|submissions|application)?";
  const values = [deadlineFromHtml(html)].filter((value): value is string => Boolean(value));
  for (const pattern of [
    new RegExp(`${phase}\\s*deadline\\s*:?\\s*(${date})`, "gi"),
    new RegExp(`(${date})\\s+${phase}\\s*deadline`, "gi"),
  ]) {
    for (const match of visible.matchAll(pattern)) if (match[1]) values.push(match[1]);
  }
  return [...new Set(values)];
}

function deadlineKindFromHtml(html: string): "rolling" | "until-filled" | undefined {
  const visible = text(html).toLowerCase();
  if (/\b(?:rolling (?:deadline|basis|submissions?|applications?)|submissions? (?:are )?accepted (?:on a )?rolling basis)\b/.test(visible)) return "rolling";
  if (/\b(?:open until filled|until (?:the position is )?filled)\b/.test(visible)) return "until-filled";
  return undefined;
}

function nearestHeading(html: string): string | undefined {
  return [...html.matchAll(HEADING)].map((match) => text(match[3] ?? "")).filter(Boolean).at(-1);
}

function classText(html: string, className: string): string | undefined {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text(new RegExp(`<([a-z][\\w:-]*)[^>]*class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "i").exec(html)?.[2] ?? "") || undefined;
}

function shortMdyDeadline(value: string): string | undefined {
  const match = /(?:deadline\s*:?\s*)?\b(0?[1-9]|1[0-2])[.\/-](0?[1-9]|[12]\d|3[01])[.\/-](\d{2})\b/i.exec(value);
  if (!match) return undefined;
  return `20${match[3]}-${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function readJsonPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function embeddedJsonExtraction(source: AdapterContext["source"], snapshot: PageSnapshot): ExtractionResult | undefined {
  const configured = source.config.embeddedJson;
  if (!configured || typeof configured !== "object") return undefined;
  const config = configured as {
    scriptId?: string;
    recordPath?: string;
    fieldMap?: Record<string, string | string[]>;
    requiredEquals?: Record<string, unknown>;
    datePath?: string;
    maximumDaysAhead?: number;
  };
  if (!config.scriptId || !config.recordPath || !config.fieldMap) return undefined;
  const escapedId = config.scriptId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const script = new RegExp(`<script\\b[^>]*id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i").exec(snapshot.html)?.[1];
  if (!script) return { fields: [], candidateLinks: [], warnings: [`Embedded JSON script ${config.scriptId} was not found`] };
  let parsed: unknown;
  try { parsed = JSON.parse(script); } catch { return { fields: [], candidateLinks: [], warnings: [`Embedded JSON script ${config.scriptId} was invalid`] }; }
  const selected = readJsonPath(parsed, config.recordPath);
  if (!Array.isArray(selected)) return { fields: [], candidateLinks: [], warnings: [`Embedded JSON record path ${config.recordPath} was not an array`] };
  const fields: ExtractionResult["fields"] = [];
  const candidateLinks: ExtractionResult["candidateLinks"] = [];
  const now = Date.now();
  const values = (record: Record<string, unknown>, name: string): string[] => {
    const configuredPaths = config.fieldMap?.[name];
    const paths = Array.isArray(configuredPaths) ? configuredPaths : configuredPaths ? [configuredPaths] : [];
    return paths.flatMap((path) => {
      const value = readJsonPath(record, path);
      return typeof value === "string" && value.trim() ? [value.trim()] : [];
    });
  };
  for (const raw of selected) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    if (Object.entries(config.requiredEquals ?? {}).some(([path, expected]) => readJsonPath(record, path) !== expected)) continue;
    const deadlineValue = config.datePath ? readJsonPath(record, config.datePath) : undefined;
    if (config.datePath) {
      const timestamp = typeof deadlineValue === "string" ? Date.parse(deadlineValue) : Number.NaN;
      if (!Number.isFinite(timestamp) || timestamp < now) continue;
      if (config.maximumDaysAhead !== undefined && timestamp > now + Math.max(1, config.maximumDaysAhead) * 86_400_000) continue;
    }
    const id = values(record, "id")[0];
    const url = values(record, "url")[0];
    if (!id || !url) continue;
    try { if (new URL(url).protocol !== "https:") continue; } catch { continue; }
    const title = values(record, "title")[0];
    candidateLinks.push({ url, stableId: id, canonicalUrl: url, ...(title ? { title } : {}), role: "detail", authority: "destination" });
    for (const fieldName of ["title", "organization", "description", "deadline", "opportunityType"] as const) {
      const value = values(record, fieldName)[0];
      if (value) fields.push({ fieldName, rawValue: value, normalizedValue: value, confidence: 0.9, provenance: { adapterId: "generic-html-v2", method: `embedded-json-${fieldName}`, sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id, recordId: id } });
    }
  }
  return { fields, candidateLinks, warnings: candidateLinks.length ? [] : ["Embedded JSON contained no current eligible opportunity records"] };
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
    const url = new URL(value.replace(/&amp;/gi, "&"), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if ((url.hostname === "google.com" || url.hostname === "www.google.com") && url.pathname === "/url") {
      const target = url.searchParams.get("q") ?? url.searchParams.get("url");
      if (target) return absoluteUrl(target, base);
    }
    url.hash = "";
    return url.href;
  } catch {
    return undefined;
  }
}

function mainContent(html: string): string {
  return html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html;
}

function normalizedHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const FIRST_PARTY_SIGNAL = /apply|application|submit|submission|open[- ]?call|opportunit|contest|prize|award|fellowship|grant|residen|deadline|entry|program/i;

function firstPartyLinks(snapshot: PageSnapshot, config: ReturnType<typeof destinationConfig>): DestinationCandidate[] {
  const hop = config.firstPartyHop;
  if (!hop || config.pageRole !== "detail") return [];
  const sourceHost = normalizedHost(snapshot.finalUrl);
  const excludedHosts = new Set((hop.excludedHosts ?? []).map((host) => host.toLowerCase().replace(/^www\./, "")));
  const byHost = new Map<string, { candidate: DestinationCandidate; score: number }>();
  const html = hop.articleOnly === false ? snapshot.html : mainContent(snapshot.html);
  for (const match of html.matchAll(OPENING_LINK)) {
    const href = match[1] ?? match[2] ?? match[3];
    const url = href ? absoluteUrl(href, snapshot.finalUrl) : undefined;
    if (!url) continue;
    const host = normalizedHost(url);
    if (!host || host === sourceHost || [...excludedHosts].some((excluded) => host === excluded || host.endsWith(`.${excluded}`))) continue;
    const start = match.index ?? 0;
    const context = `${html.slice(Math.max(0, start - 180), start)} ${html.slice(start + match[0].length, start + match[0].length + 180)}`;
    const title = text(context).slice(0, 240);
    const parsed = new URL(url);
    if (/\.(?:pdf|docx?|xlsx?)(?:$|[?#])/i.test(parsed.pathname)) continue;
    const score = (FIRST_PARTY_SIGNAL.test(`${url} ${title}`) ? 10 : 0) + Math.min(parsed.pathname.split("/").filter(Boolean).length, 6) - (parsed.protocol === "http:" ? 5 : 0);
    const candidate: DestinationCandidate = { url, ...(title ? { title: title.slice(0, 240) } : {}), role: "detail", authority: "destination" };
    const existing = byHost.get(host);
    if (!existing || score > existing.score) byHost.set(host, { candidate, score });
  }
  return [...byHost.values()]
    .sort((left, right) => right.score - left.score || left.candidate.url.localeCompare(right.candidate.url))
    .map(({ candidate }) => candidate)
    .slice(0, Math.min(Math.max(hop.limit ?? 1, 1), 3));
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
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const candidate = await fetch(context.source.url, {
          headers: { accept: "text/html,application/xhtml+xml", "user-agent": `${USER_AGENT} (+https://www.usemissa.com)` },
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
        });
        if ((candidate.status === 403 || candidate.status === 429 || candidate.status >= 500) && attempt === 0) continue;
        response = candidate;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!response) throw lastError instanceof Error ? lastError : new Error("HTML source fetch failed after bounded retry");
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
      for (const deadline of deadlineValuesFromHtml(snapshot.html)) fields.push({ fieldName: "deadline", rawValue: deadline, normalizedValue: deadline, confidence: 0.58, provenance: { adapterId: this.id, method: "html-deadline-label", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const deadlineKind = deadlineKindFromHtml(snapshot.html);
      if (deadlineKind) fields.push({ fieldName: "deadlineKind", rawValue: deadlineKind, normalizedValue: deadlineKind, confidence: 0.9, provenance: { adapterId: this.id, method: "html-deadline-kind", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const entryFee = labeledValue(snapshot.html, /entry\s+fee/i);
      if (entryFee) fields.push({ fieldName: "entry_fee", rawValue: entryFee, normalizedValue: entryFee, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const cashPrize = labeledValue(snapshot.html, /cash\s+prize|prize/i);
      if (cashPrize) fields.push({ fieldName: "cash_prize", rawValue: cashPrize, normalizedValue: cashPrize, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const contactEmail = labeledValue(snapshot.html, /e-?mail|email/i);
      if (contactEmail) fields.push({ fieldName: "contact_email", rawValue: contactEmail, normalizedValue: contactEmail, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
      const officialWebsite = labeledValue(snapshot.html, /website|official\s+site/i);
      if (officialWebsite) fields.push({ fieldName: "official_website", rawValue: officialWebsite, normalizedValue: officialWebsite, confidence: 0.84, provenance: { adapterId: this.id, method: "html-labeled-field", sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id } });
    }
    const embedded = embeddedJsonExtraction(context.source, snapshot);
    if (embedded) return embedded;
    const configuredFirstPartyLinks = firstPartyLinks(snapshot, config);
    if (configuredFirstPartyLinks.length || (config.pageRole === "detail" && config.firstPartyHop)) {
      const warnings = antiBotChallenge ? ["Content indicates an anti-bot or JavaScript challenge"] : softNotFound ? ["Content indicates page not found despite a successful HTTP response"] : fields.length ? [] : ["No title-like heading found"];
      if (!configuredFirstPartyLinks.length && !antiBotChallenge && !softNotFound) warnings.push("No bounded first-party destination was found in the article body");
      return { fields, candidateLinks: configuredFirstPartyLinks, warnings };
    }
    const candidateLinks = [];
    const seenUrls = new Set<string>();
    let previousAcceptedLinkEnd = 0;
    for (const match of snapshot.html.matchAll(LINK)) {
      const url = absoluteUrl(match[1]!, snapshot.finalUrl);
      const label = text(match[2] ?? "");
      if (!url || url === snapshot.finalUrl || url === context.source.url) continue;
      if ((match[1] ?? "").includes("&#")) continue;
      const candidateHost = normalizedHost(url);
      if (config.allowedHosts?.length && !config.allowedHosts.some((host) => candidateHost === host.toLowerCase().replace(/^www\./, ""))) continue;
      const exclusionHaystack = `${new URL(url).pathname} ${label}`.toLowerCase();
      if (config.excludedPatterns?.some((pattern) => exclusionHaystack.includes(pattern.toLowerCase()))) continue;
      if (config.requiredLinkRegex && !new RegExp(config.requiredLinkRegex, "i").test(exclusionHaystack)) continue;
      const configuredPathDetail = config.detailPathRegex && new RegExp(config.detailPathRegex, "i").test(new URL(url).pathname);
      const candidate = configuredPathDetail
        ? { url, ...(label ? { title: label.slice(0, 240) } : {}), role: "detail" as const, authority: "destination" as const }
        : classifyDestination(url, label, config);
      if (candidate.role === "apply" && new URL(url).pathname === "/") continue;
      if (candidate.role === "detail" && new URL(url).pathname.endsWith("/") && new URL(url).pathname.split("/").filter(Boolean).length <= 1) continue;
      if (seenUrls.has(url)) continue;
      const explicitDestination = candidate.role === "detail" || candidate.role === "apply" || candidate.role === "feed";
      const heuristicDestination = !config.rules?.length && /apply|submit|deadline|opportunit|grant|award|contest|residen|fellowship|open[- ]?call|read more/i.test(`${url} ${label}`);
      if (explicitDestination || heuristicDestination) {
        seenUrls.add(url);
        candidateLinks.push(candidate);
        if (config.sourceCard && config.pageRole === "landing") {
          const linkStart = match.index ?? 0;
          const beforeChars = Math.min(Math.max(config.sourceCard.beforeChars ?? 8_000, 500), 20_000);
          const contextStart = Math.max(previousAcceptedLinkEnd, linkStart - beforeChars);
          const contextHtml = snapshot.html.slice(contextStart, linkStart);
          const recordId = candidate.stableId ?? candidate.canonicalUrl ?? candidate.url;
          const addContextField = (fieldName: string, value: string | undefined, confidence: number) => {
            if (!value) return;
            fields.push({ fieldName, rawValue: value, normalizedValue: value, confidence, provenance: { adapterId: this.id, method: `html-link-context-${fieldName}`, sourceUrl: snapshot.finalUrl, snapshotId: snapshot.id, recordId } });
          };
          const linkedTitle = config.sourceCard.titleClassName ? classText(match[2] ?? "", config.sourceCard.titleClassName) : undefined;
          addContextField("title", linkedTitle ?? (config.sourceCard.titleFromLinkLabel ? label : nearestHeading(contextHtml)), 0.9);
          addContextField("organization", config.sourceCard.organization, 1);
          addContextField("deadline", config.sourceCard.deadlineFromLinkLabel === "mdy-short" ? shortMdyDeadline(label) : deadlineFromHtml(contextHtml), 0.9);
          previousAcceptedLinkEnd = linkStart + match[0].length;
        }
      }
      if (candidateLinks.length >= (config.scanLimit ?? config.detailLimit ?? 100)) break;
    }
    if (config.candidateOrder === "url") {
      candidateLinks.sort((left, right) => left.url.localeCompare(right.url));
    }
    const warnings = antiBotChallenge ? ["Content indicates an anti-bot or JavaScript challenge"] : softNotFound ? ["Content indicates page not found despite a successful HTTP response"] : fields.length ? [] : [config.pageRole === "landing" ? "Landing page is not an opportunity; detail destinations must be fetched" : "No title-like heading found"];
    return { fields, candidateLinks, warnings };
  }
}

export function createBenchmarkSources(adapterId = "generic-html-v2") {
  return [
    { id: "benchmark-pw-grants", name: "Poets & Writers Grants", url: "https://www.pw.org/grants", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "contest", "award"], schedule: { lane: "single-run" as const, cadenceHours: 168 }, config: { comparisonAdapter: "gary", garySourceId: "pw.org", garyTargetUrl: "https://www.pw.org/writing_contests/other_futures_award", extraction: { titleClassNames: ["grant-listing-title"] }, destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["/writing_contests/", "read more"], authority: "destination" }, { role: "apply", patterns: ["submit", "apply"], authority: "destination" }] } } },
    { id: "benchmark-nyfa-opportunities", name: "NYFA Opportunities", url: "https://www.nyfa.org/awards-grants/", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "fellowship", "award"], schedule: { lane: "single-run" as const, cadenceHours: 168 }, config: { comparisonAdapter: "radar", legacyUrls: ["https://www.nyfa.org/grant-discipline/visual-arts/", "https://www.nyfa.org/Content/Show/Opportunities"], destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["/awards-grants/"], authority: "destination" }, { role: "apply", patterns: ["apply", "submit"], authority: "destination" }] } } },
    { id: "benchmark-grants-gov-arts", name: "Grants.gov Arts Opportunities API", url: "https://api.grants.gov/v1/api/search2", adapterId: "json-api-v2", kind: "api" as const, geography: ["US"], opportunityTypes: ["grant", "award"], schedule: { lane: "single-run" as const, cadenceHours: 168 }, config: { transport: "json", comparisonAdapter: "none", recordPath: "data.oppHits", fieldMap: { id: "id", title: "title", organization: ["agency", "agencyName"], deadline: "closeDate" }, request: { method: "POST", body: { rows: 5, keyword: "arts", oppStatuses: "forecasted|posted", fundingCategories: "AR" } }, detailRequest: { url: "https://api.grants.gov/v1/api/fetchOpportunity", method: "POST", bodyField: "opportunityId", canonicalUrlTemplate: "https://www.grants.gov/search-results-detail/{{id}}" }, destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["fetchOpportunity"], authority: "destination" }] } } },
    { id: "benchmark-creative-capital", name: "Creative Capital Artist Opportunities", url: "https://creative-capital.org/artist-resources/artist-opportunities/", adapterId, kind: "directory" as const, geography: ["US", "global"], opportunityTypes: ["grant", "fellowship", "residency", "open-call"], schedule: { lane: "single-run" as const, cadenceHours: 168 }, config: { comparisonAdapter: "radar", legacyUrls: ["https://creative-capital.org/opportunities/"], destination: { pageRole: "landing", detailLimit: 5, rules: [{ role: "detail", patterns: ["?opportunity", "artist-opportunities", "opportunit"], authority: "destination" }, { role: "apply", patterns: ["apply", "submit"], authority: "destination" }] } } },
  ];
}
