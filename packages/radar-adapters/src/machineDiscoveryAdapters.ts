import type { Source } from "@missa/radar-engine";
import type { DiscoveredSourceLink } from "./sourceDiscoveryAdapters.js";

export const GRANTS_GOV_API_ENDPOINT = "https://api.grants.gov/v1/api/search2";
export const EU_FUNDING_API_ENDPOINT = "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=***";
const GRANTS_GOV_DETAIL_ROOT = "https://www.grants.gov/search-results-detail";
const GRANTS_GOV_MAX_RESULTS = 1_000;
const EU_CREATIVE_EUROPE_PROGRAMME = "43251814";
const EU_MAX_RESULTS = 100;
const LONG_TERM_CHECK_INTERVAL_HOURS = 8_760;
const SUNDANCE_DEADLINES_URL = "https://www.sundance.org/deadlines/";
const IDA_GRANTS_DIRECTORY_URL = "https://www.documentary.org/grants-directory";
const NYFA_VISUAL_ARTS_URL = "https://www.nyfa.org/grant-discipline/visual-arts/";

type GrantsGovHit = {
  id?: string | number;
  number?: string;
  title?: string;
  agency?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
};

type GrantsGovSearchResponse = {
  errorcode?: number;
  msg?: string;
  data?: {
    hitCount?: number;
    oppHits?: GrantsGovHit[];
  };
};

type EuFundingHit = {
  reference?: string;
  summary?: string;
  url?: string;
  language?: string;
  metadata?: Record<string, string[] | undefined>;
};

type EuFundingResponse = {
  totalResults?: number;
  results?: EuFundingHit[];
  warnings?: unknown[];
};

export interface MachineDiscoveryResult {
  finalUrl: string;
  rawContent: string;
  links: DiscoveredSourceLink[];
}

export function isMachineDiscoveryAdapter(adapterId: string | undefined): boolean {
  return adapterId === "grants-gov-api" || adapterId === "eu-funding-api" || adapterId === "sundance-deadlines" || adapterId === "ida-grants-directory" || adapterId === "nyfa-visual-arts";
}

function htmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function nyfaVisualArtsLinksFromHtml(html: string, parentSourceId: string): DiscoveredSourceLink[] {
  const links: DiscoveredSourceLink[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1]!.replaceAll("&amp;", "&").trim();
    const title = htmlText(match[2]!).slice(0, 240);
    if (!/^https:\/\/www\.nyfa\.org\/awards-grants\/[a-z0-9-]+\/?$/i.test(href) || !title) continue;
    const externalId = `nyfa:${href.toLowerCase().replace(/\/$/, "")}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    links.push({
      url: href,
      title,
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: parentSourceId,
      discoveryExternalId: externalId,
      discoveryExternalStatus: "posted",
      registryOrganizationName: "New York Foundation for the Arts",
      registryTrust: {
        status: "verified",
        authorityKind: "official-source",
        score: 95,
        evidenceUrl: NYFA_VISUAL_ARTS_URL,
        reviewNote: "Opportunity emitted by NYFA's official Visual Arts archive.",
      },
      checkIntervalHours: 24,
      discoveryMachineRecord: {
        title,
        organizationName: "New York Foundation for the Arts",
        applicationUrl: href,
        evidenceUrl: NYFA_VISUAL_ARTS_URL,
      },
    });
  }
  return links;
}

function sundanceDeadlineLinks(
  html: string,
  parentSourceId: string,
  now = new Date(),
): DiscoveredSourceLink[] {
  const links: DiscoveredSourceLink[] = [];
  const seen = new Set<string>();
  const cardPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|<\/main>|<\/body>)/gi;
  for (const match of html.matchAll(cardPattern)) {
    const title = htmlText(match[1]!).slice(0, 240);
    const card = match[2]!;
    const deadlineMatch = card.match(/(?:extended\s+)?deadline\s*:\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
    const deadlineDate = isoDate(deadlineMatch?.[1]);
    const applicationUrl = [...card.matchAll(/href=["']([^"']+)["']/gi)]
      .map((item) => item[1]!)
      .find((url) => /^(?:https:\/\/apply\.sundance\.org\/|https:\/\/filmfreeway\.com\/)/i.test(url));
    if (!title || !deadlineDate || !applicationUrl || deadlineDate < now.toISOString().slice(0, 10)) continue;
    const externalId = `sundance:${applicationUrl.toLowerCase()}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    links.push({
      url: applicationUrl,
      title,
      kind: "organization-website",
      registryTier: 0,
      followsOutboundLinks: false,
      discoveredFromSourceId: parentSourceId,
      discoveryExternalId: externalId,
      discoveryExternalStatus: "posted",
      registryOrganizationName: "Sundance Institute",
      registryTrust: {
        status: "verified",
        authorityKind: "official-source",
        score: 95,
        evidenceUrl: SUNDANCE_DEADLINES_URL,
        reviewNote: "Current opportunity emitted by Sundance Institute's official Artist Opportunities page.",
      },
      checkIntervalHours: 24,
      discoveryMachineRecord: {
        title,
        organizationName: "Sundance Institute",
        deadlineDate,
        applicationUrl,
        evidenceUrl: SUNDANCE_DEADLINES_URL,
        description: htmlText(card).slice(0, 2_000),
      },
    });
  }
  return links;
}

function unescapeAirtableUrl(value: string): string {
  return value.replaceAll("\\u002F", "/").replaceAll("\\u0026", "&").replaceAll("\\u003D", "=");
}

async function idaGrantLinks(
  html: string,
  parentSourceId: string,
  fetcher: typeof fetch,
): Promise<{ links: DiscoveredSourceLink[]; evidence: string }> {
  const iframe = html.match(/<iframe\b[^>]+src=["']([^"']*airtable\.com\/embed\/[^"']+)["']/i)?.[1];
  if (!iframe) throw new Error("IDA grants directory Airtable embed not found");
  const embedResponse = await fetcher(iframe, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(30_000) });
  if (!embedResponse.ok) throw new Error(`IDA Airtable embed HTTP ${embedResponse.status}`);
  const embedHtml = await embedResponse.text();
  const rawUrl = embedHtml.match(/urlWithParams:\s*"([^"]+)/)?.[1];
  if (!rawUrl) throw new Error("IDA Airtable data endpoint not found");
  const endpoint = unescapeAirtableUrl(rawUrl);
  const applicationId = embedHtml.match(/"applicationId":"([^"]+)/)?.[1];
  const pageLoadId = embedHtml.match(/"pageLoadId":"([^"]+)/)?.[1];
  const csrfToken = embedHtml.match(/"csrfToken":"([^"]+)/)?.[1];
  const dataResponse = await fetcher(`https://airtable.com${endpoint}`, {
    headers: {
      accept: "application/json",
      "x-requested-with": "XMLHttpRequest",
      "x-airtable-inter-service-client": "webClient",
      "x-airtable-application-id": applicationId ?? "",
      "x-airtable-page-load-id": pageLoadId ?? "",
      "x-time-zone": "UTC",
      "x-csrf-token": csrfToken ?? "",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!dataResponse.ok) throw new Error(`IDA Airtable data HTTP ${dataResponse.status}`);
  const payload = await dataResponse.json() as { data?: { table?: { columns?: Array<{ id: string; name: string }>; rows?: Array<{ id: string; cellValuesByColumnId?: Record<string, unknown> }> } } };
  const table = payload.data?.table;
  if (!table?.columns || !table.rows) throw new Error("IDA Airtable response missing table rows");
  const columnIds = new Map(table.columns.map((column) => [column.name.toLowerCase(), column.id]));
  const value = (row: { cellValuesByColumnId?: Record<string, unknown> }, name: string): string => {
    const raw = row.cellValuesByColumnId?.[columnIds.get(name.toLowerCase()) ?? ""];
    if (typeof raw === "string") return htmlText(raw);
    if (Array.isArray(raw)) return raw.map((item) => typeof item === "string" ? item : (item as { foreignRowDisplayName?: string }).foreignRowDisplayName ?? "").join(", ");
    if (raw && typeof raw === "object" && "documentValue" in raw) return htmlText(JSON.stringify(raw));
    return "";
  };
  const seen = new Set<string>();
  const links = table.rows.flatMap((row) => {
    const title = value(row, "Grant Name");
    const url = value(row, "Link");
    const status = value(row, "Status");
    // IDA's public view is already filtered to active listings. The status
    // field is a multi-select ID rather than the display label in Airtable's
    // public JSON, so presence is the reliable public-view signal.
    if (!row.id || !title || !/^https?:\/\//i.test(url) || !status || seen.has(row.id)) return [];
    seen.add(row.id);
    return [{
      url,
      title,
      kind: "organization-website" as const,
      registryTier: 0 as const,
      followsOutboundLinks: false,
      discoveredFromSourceId: parentSourceId,
      discoveryExternalId: `ida:${row.id}`,
      discoveryExternalStatus: "active",
      registryOrganizationName: "International Documentary Association",
      registryTrust: { status: "verified" as const, authorityKind: "official-source" as const, score: 95, evidenceUrl: IDA_GRANTS_DIRECTORY_URL, reviewNote: "Active listing from IDA's public grants directory." },
      checkIntervalHours: 168,
      discoveryMachineRecord: { title, organizationName: "International Documentary Association", description: value(row, "Description"), applicationUrl: url, evidenceUrl: IDA_GRANTS_DIRECTORY_URL },
    }];
  });
  return { links, evidence: `IDA public grants directory rows: ${links.length}` };
}

export function euFundingSearchQuery(): Record<string, unknown> {
  return {
    bool: {
      must: [
        { terms: { type: ["1", "2", "8"] } },
        { terms: { status: ["31094501", "31094502"] } },
        { terms: { frameworkProgramme: [EU_CREATIVE_EUROPE_PROGRAMME] } },
        { terms: { language: ["en"] } },
      ],
    },
  };
}

function first(values: string[] | undefined): string | undefined {
  return values?.map((value) => value.trim()).find(Boolean);
}

function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : undefined;
}

function usDate(value: string | undefined): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() ?? "");
  if (!match) return undefined;
  const [, month, day, year] = match;
  const normalized = `${year}-${month}-${day}`;
  return isoDate(normalized) === normalized ? normalized : undefined;
}

function nextDeadline(values: string[] | undefined, now: Date): string | undefined {
  const today = now.toISOString().slice(0, 10);
  return (values ?? [])
    .map(isoDate)
    .filter((value): value is string => typeof value === "string" && value >= today)
    .sort()[0];
}

function cleanText(value: string | undefined): string | undefined {
  const cleaned = value
    ?.replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, 2_000) : undefined;
}

function officialEuUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("ec.europa.eu") ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function euFundingLinksFromResponse(
  payload: EuFundingResponse,
  parentSourceId: string,
  now = new Date(),
): DiscoveredSourceLink[] {
  if (!Array.isArray(payload.results) || !Number.isFinite(Number(payload.totalResults))) {
    throw new Error("EU Funding API returned an invalid response");
  }
  if (Number(payload.totalResults) > EU_MAX_RESULTS) {
    throw new Error(`EU Funding result set ${payload.totalResults} exceeds the bounded connector limit`);
  }
  const seen = new Set<string>();
  return payload.results.flatMap((hit) => {
    const metadata = hit.metadata ?? {};
    const reference = String(hit.reference ?? "").trim();
    const title = cleanText(hit.summary ?? first(metadata.callTitle) ?? first(metadata.title));
    const url = officialEuUrl(hit.url ?? first(metadata.url));
    const deadlineDate = nextDeadline(metadata.deadlineDate, now);
    const status = first(metadata.status);
    const programme = first(metadata.frameworkProgramme);
    const language = hit.language ?? first(metadata.language);
    if (
      !reference || !title || !url || !deadlineDate || seen.has(reference) ||
      language !== "en" || programme !== EU_CREATIVE_EUROPE_PROGRAMME ||
      !status || !["31094501", "31094502"].includes(status)
    ) return [];
    seen.add(reference);
    const externalStatus = status === "31094501" ? "forecasted" : "posted";
    return [{
      url,
      title,
      kind: "organization-website" as const,
      registryTier: 0 as const,
      followsOutboundLinks: false,
      discoveredFromSourceId: parentSourceId,
      discoveryExternalId: `eu-ft:${reference}`,
      discoveryExternalStatus: externalStatus,
      registryOrganizationName: "Creative Europe",
      registryTrust: {
        status: "verified",
        authorityKind: "official-source",
        score: 95,
        evidenceUrl: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/apis",
        reviewNote: "Creative Europe call emitted by the official EU Funding and Tenders public API.",
      },
      checkIntervalHours: 24,
      discoveryMachineRecord: {
        title,
        organizationName: "Creative Europe",
        openDate: isoDate(first(metadata.startDate)),
        deadlineDate,
        applicationUrl: url,
        description: cleanText(first(metadata.description) ?? first(metadata.furtherInformation)),
        evidenceUrl: EU_FUNDING_API_ENDPOINT,
      },
    }];
  });
}

export function grantsGovSearchRequest(): Record<string, string | number> {
  return {
    rows: GRANTS_GOV_MAX_RESULTS,
    startRecordNum: 0,
    fundingCategories: "AR",
    oppStatuses: "forecasted|posted",
    sortBy: "openDate|desc",
  };
}

export function grantsGovLinksFromResponse(
  payload: GrantsGovSearchResponse,
  parentSourceId: string,
): DiscoveredSourceLink[] {
  if (payload.errorcode !== 0 || !payload.data || !Array.isArray(payload.data.oppHits)) {
    throw new Error(`Grants.gov API failed: ${payload.msg ?? "invalid response"}`);
  }
  const reported = Number(payload.data.hitCount ?? payload.data.oppHits.length);
  if (reported > GRANTS_GOV_MAX_RESULTS) {
    throw new Error(`Grants.gov result set ${reported} exceeds the bounded connector limit`);
  }
  const seen = new Set<string>();
  return payload.data.oppHits.flatMap((hit) => {
    const id = String(hit.id ?? "").trim();
    const title = String(hit.title ?? "").replace(/\s+/g, " ").trim();
    const agency = String(hit.agency ?? "").replace(/\s+/g, " ").trim();
    const externalStatus = String(hit.oppStatus ?? "unknown").toLowerCase();
    if (!/^\d+$/.test(id) || !title || seen.has(id)) return [];
    seen.add(id);
    return [{
      url: `${GRANTS_GOV_DETAIL_ROOT}/${id}`,
      title: title.slice(0, 240),
      kind: "organization-website" as const,
      registryTier: 0 as const,
      followsOutboundLinks: false,
      discoveredFromSourceId: parentSourceId,
      discoveryExternalId: `grants.gov:${id}`,
      discoveryExternalStatus: externalStatus,
      ...(agency ? { registryOrganizationName: agency.slice(0, 240) } : {}),
      registryTrust: {
        status: "verified",
        authorityKind: "official-source",
        score: 95,
        evidenceUrl: "https://www.grants.gov/api/api-guide",
        reviewNote: "Canonical Grants.gov detail URL emitted by the official public API.",
      },
      checkIntervalHours: externalStatus === "posted" || externalStatus === "forecasted"
        ? 24
        : LONG_TERM_CHECK_INTERVAL_HOURS,
      discoveryMachineRecord: {
        title: title.slice(0, 240),
        ...(agency ? { organizationName: agency.slice(0, 240) } : {}),
        ...(usDate(hit.openDate) ? { openDate: usDate(hit.openDate) } : {}),
        ...(usDate(hit.closeDate) ? { deadlineDate: usDate(hit.closeDate) } : {}),
        applicationUrl: `${GRANTS_GOV_DETAIL_ROOT}/${id}`,
        evidenceUrl: GRANTS_GOV_API_ENDPOINT,
      },
    }];
  });
}

export async function fetchMachineDiscoverySource(
  source: Source,
  fetcher: typeof fetch = fetch,
): Promise<MachineDiscoveryResult> {
  if (source.discoveryAdapterId === "ida-grants-directory") {
    const response = await fetcher(source.url, { headers: { accept: "text/html", "user-agent": "MissaRadar/1.0 (+https://www.usemissa.com; official-source; evidence-only)" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`IDA grants directory HTTP ${response.status}`);
    const rawContent = await response.text();
    const result = await idaGrantLinks(rawContent, source.id, fetcher);
    return { finalUrl: response.url, rawContent: `${result.evidence}\n\n${rawContent}`, links: result.links };
  }
  if (source.discoveryAdapterId === "nyfa-visual-arts") {
    const response = await fetcher(source.url, { headers: { accept: "text/html", "user-agent": "MissaRadar/1.0 (+https://www.usemissa.com; official-source; evidence-only)" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`NYFA visual arts archive HTTP ${response.status}`);
    const rawContent = await response.text();
    return { finalUrl: response.url || source.url, rawContent, links: nyfaVisualArtsLinksFromHtml(rawContent, source.id) };
  }
  if (source.discoveryAdapterId === "sundance-deadlines") {
    const response = await fetcher(source.url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "MissaRadar/1.0 (+https://www.usemissa.com; official-source; evidence-only)",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Sundance deadlines HTTP ${response.status}`);
    const rawContent = await response.text();
    return {
      finalUrl: response.url,
      rawContent,
      links: sundanceDeadlineLinks(rawContent, source.id),
    };
  }
  if (source.discoveryAdapterId === "eu-funding-api") {
    const form = new FormData();
    form.append("query", new Blob([JSON.stringify(euFundingSearchQuery())], { type: "application/json" }), "query.json");
    form.append("pageSize", String(EU_MAX_RESULTS));
    form.append("pageNumber", "1");
    form.append("language", "en");
    const response = await fetcher(EU_FUNDING_API_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "user-agent": "MissaRadar/1.0 (+https://www.usemissa.com; official-api; evidence-only)",
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`EU Funding API HTTP ${response.status}`);
    const rawContent = await response.text();
    let payload: EuFundingResponse;
    try {
      payload = JSON.parse(rawContent) as EuFundingResponse;
    } catch {
      throw new Error("EU Funding API returned invalid JSON");
    }
    return {
      finalUrl: EU_FUNDING_API_ENDPOINT,
      rawContent,
      links: euFundingLinksFromResponse(payload, source.id),
    };
  }
  if (source.discoveryAdapterId !== "grants-gov-api") {
    throw new Error(`unsupported machine discovery adapter: ${source.discoveryAdapterId ?? "none"}`);
  }
  const response = await fetcher(GRANTS_GOV_API_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "MissaRadar/1.0 (+https://www.usemissa.com; official-api; evidence-only)",
    },
    body: JSON.stringify(grantsGovSearchRequest()),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Grants.gov API HTTP ${response.status}`);
  const rawContent = await response.text();
  let payload: GrantsGovSearchResponse;
  try {
    payload = JSON.parse(rawContent) as GrantsGovSearchResponse;
  } catch {
    throw new Error("Grants.gov API returned invalid JSON");
  }
  return {
    finalUrl: GRANTS_GOV_API_ENDPOINT,
    rawContent,
    links: grantsGovLinksFromResponse(payload, source.id),
  };
}
