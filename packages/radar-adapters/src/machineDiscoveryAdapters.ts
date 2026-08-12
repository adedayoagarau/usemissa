import type { Source } from "@missa/radar-engine";
import type { DiscoveredSourceLink } from "./sourceDiscoveryAdapters.js";

export const GRANTS_GOV_API_ENDPOINT = "https://api.grants.gov/v1/api/search2";
const GRANTS_GOV_DETAIL_ROOT = "https://www.grants.gov/search-results-detail";
const GRANTS_GOV_MAX_RESULTS = 1_000;
const LONG_TERM_CHECK_INTERVAL_HOURS = 8_760;

type GrantsGovHit = {
  id?: string | number;
  title?: string;
  agency?: string;
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

export interface MachineDiscoveryResult {
  finalUrl: string;
  rawContent: string;
  links: DiscoveredSourceLink[];
}

export function isMachineDiscoveryAdapter(adapterId: string | undefined): boolean {
  return adapterId === "grants-gov-api";
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
    }];
  });
}

export async function fetchMachineDiscoverySource(
  source: Source,
  fetcher: typeof fetch = fetch,
): Promise<MachineDiscoveryResult> {
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
