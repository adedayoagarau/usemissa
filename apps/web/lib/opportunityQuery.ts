import {
  opportunityBrowseQuerySchema,
  type OpportunityBrowseQuery,
} from "@missa/contracts";

function listParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const value = params.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function booleanParam(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const values = params.getAll(key);
  const value = values.at(-1);
  if (value === null) return fallback;
  if (value === undefined) return fallback;
  return value === "1" || value === "true";
}

/** Parses public URL state into the bounded contract used by every repository. */
export function parseOpportunityBrowseQuery(params: URLSearchParams): OpportunityBrowseQuery {
  const candidate = {
    query: params.get("q") ?? undefined,
    category: params.get("category") ?? "all",
    types: listParam(params, "type"),
    disciplines: listParam(params, "discipline"),
    genres: listParam(params, "genre"),
    taxonomyTermIds: listParam(params, "taxonomy"),
    taxonomyIncludeDescendants: booleanParam(params, "taxonomyDescendants", false),
    locations: listParam(params, "location"),
    feeStatus: booleanParam(params, "feeToggle", false) ? "no-fee" : params.get("fee") ?? undefined,
    maxFeeCents: numberParam(params, "maxFeeCents"),
    deadlineWithinDays: numberParam(params, "deadlineWithinDays"),
    openNow: booleanParam(params, "openNow", true),
    verifiedOnly: booleanParam(params, "verified", false),
    simultaneousRequired: params.has("simultaneous")
      ? booleanParam(params, "simultaneous", false)
      : undefined,
    sort: params.get("sort") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
    limit: numberParam(params, "limit"),
  };

  const parsed = opportunityBrowseQuerySchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  // Invalid or stale URL state should degrade to a safe public query while
  // preserving no untrusted values. The UI can expose a cleaned URL later.
  return opportunityBrowseQuerySchema.parse({});
}
