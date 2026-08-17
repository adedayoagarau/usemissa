import type { SourceDefinition } from "./contracts.js";

export type DestinationRole = "detail" | "apply" | "feed" | "unknown";

export interface DestinationRequest {
  method: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  multipart?: Record<string, string | { json: unknown; filename?: string; contentType?: string }>;
}

export interface DestinationRule {
  role: DestinationRole;
  patterns: string[];
  authority: "source" | "destination";
}

export interface DestinationCandidate {
  url: string;
  /** Stable provider record identity, when the listing exposes one. */
  stableId?: string;
  /** Human-facing canonical page when evidence is fetched through an API. */
  canonicalUrl?: string;
  title?: string;
  role?: DestinationRole;
  authority?: "source" | "destination";
  request?: DestinationRequest;
}

/** Directory pages are evidence indexes. External opportunity/application
 * links are potential first-party destinations even when a source registry
 * did not provide a bespoke pattern for that directory. */
export function isPotentialDestination(source: SourceDefinition, candidate: DestinationCandidate): boolean {
  if (!candidate.url || candidate.role === 'feed') return false;
  if (candidate.authority === 'destination' && (candidate.role === 'detail' || candidate.role === 'apply')) return true;
  if (source.kind !== 'directory') return false;
  try {
    const sourceHost = new URL(source.url).hostname.replace(/^www\./, '');
    const candidateHost = new URL(candidate.url).hostname.replace(/^www\./, '');
    if (sourceHost === candidateHost) return false;
  } catch {
    return false;
  }
  return /apply|application|submit|opportunit|grant|award|contest|residen|fellowship|open[- ]?call|program|call/i.test(`${candidate.url} ${candidate.title ?? ''}`);
}

export interface DestinationConfig {
  pageRole?: "landing" | "detail";
  rules?: DestinationRule[];
  /** Optional anchored path expression for sites whose detail URLs are
   * numeric or otherwise cannot be expressed safely as a substring rule. */
  detailPathRegex?: string;
  excludedPatterns?: string[];
  /** Optional full link/path expression required before a link may consume a
   * bounded candidate slot. */
  requiredLinkRegex?: string;
  /** Skip stale or deadline-less child chains and continue scanning the
   * bounded index until the review quota is filled. */
  requireCurrentDeadlineBeforeReview?: boolean;
  /** The source record is itself authoritative structured evidence. The
   * linked destination is still fetched, but reconciliation may use the
   * complete API record when the destination is a JavaScript shell. */
  structuredRecordAuthority?: boolean;
  /** Adapter used for child destinations when the listing transport differs
   * from the linked page (for example, a JSON API linking to HTML pages). */
  destinationAdapterId?: string;
  /** Optional exact host allowlist for indexes whose navigation uses the same
   * generic labels as their actual opportunity links. */
  allowedHosts?: string[];
  detailLimit?: number;
  /** Maximum index links inspected to fill the smaller detailLimit with
   * successfully reconciled candidates. */
  scanLimit?: number;
  /** Stabilize a bounded dynamic index whose server-rendered cards can arrive
   * in different orders without the underlying opportunity set changing. */
  candidateOrder?: "url";
  /** A directory-specific detail page may point onward to the organizer's
   * first-party page. When configured, v2 extracts only bounded external
   * links from the article body and fetches the strongest one before review. */
  firstPartyHop?: {
    articleOnly?: boolean;
    excludedHosts?: string[];
    limit?: number;
  };
  /** Extract title/deadline evidence from the bounded source card immediately
   * preceding a link. Official publishers may use that card when an external
   * application platform refuses crawler access. */
  sourceCard?: {
    beforeChars?: number;
    organization?: string;
    allowBlockedDestination?: boolean;
    titleClassName?: string;
    titleFromLinkLabel?: boolean;
    deadlineFromLinkLabel?: "mdy-short";
  };
}

export function destinationConfig(source: SourceDefinition): DestinationConfig {
  return (source.config.destination as DestinationConfig | undefined) ?? {};
}

export function classifyDestination(url: string, label: string, config: DestinationConfig): DestinationCandidate {
  let pathname = url;
  let search = "";
  try { const parsed = new URL(url); pathname = parsed.pathname; search = parsed.search; } catch { /* leave the raw URL for review */ }
  const pathHaystack = `${pathname} ${label}`.toLowerCase();
  const queryHaystack = `${pathname}${search} ${label}`.toLowerCase();
  for (const rule of config.rules ?? []) {
    if (rule.patterns.some((pattern) => (pattern.startsWith("?") ? queryHaystack : pathHaystack).includes(pattern.toLowerCase()))) {
      return { url, ...(label ? { title: label.slice(0, 240) } : {}), role: rule.role, authority: rule.authority };
    }
  }
  return { url, ...(label ? { title: label.slice(0, 240) } : {}), role: "unknown", authority: "source" };
}
