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
