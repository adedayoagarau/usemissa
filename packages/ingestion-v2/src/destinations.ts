import type { SourceDefinition } from "./contracts.js";

export type DestinationRole = "detail" | "apply" | "feed" | "unknown";

export interface DestinationRequest {
  method: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
}

export interface DestinationRule {
  role: DestinationRole;
  patterns: string[];
  authority: "source" | "destination";
}

export interface DestinationCandidate {
  url: string;
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
  detailLimit?: number;
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
