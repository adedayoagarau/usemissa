import { getRegistry, trustedSource, type SourceRegistryEntry } from "@missa/radar-engine";
import type { SourceDefinition, SourceLane, SourceSchedule } from "./contracts.js";

export type IngestionCatalogEntry = SourceDefinition & {
  registryTier: SourceRegistryEntry["tier"];
  trustStatus: string;
  trustScore: number;
  active: boolean;
  eligible: boolean;
  skipReason?: "inactive" | "blocked" | "needs-review";
  schedule: SourceSchedule;
};

type RegistryScheduleHints = { openFrom?: string; openUntil?: string; timezone?: string; lane?: SourceLane };

function scheduleForRegistry(entry: SourceRegistryEntry, eligible: boolean): SourceSchedule {
  const hints = entry as SourceRegistryEntry & RegistryScheduleHints;
  const cadenceHours = Number.isFinite(entry.checkIntervalHours) && entry.checkIntervalHours > 0 ? entry.checkIntervalHours : 24;
  const lane: SourceLane = !eligible || !entry.active
    ? "held"
    : hints.lane ?? (entry.tier <= 1 && cadenceHours <= 24 ? "core-daily" : cadenceHours <= 24 * 14 ? "scheduled" : "single-run");
  return {
    lane,
    cadenceHours,
    ...(hints.openFrom ? { openFrom: hints.openFrom } : {}),
    ...(hints.openUntil ? { openUntil: hints.openUntil } : {}),
    ...(hints.timezone ? { timezone: hints.timezone } : {}),
  };
}

function sourceKind(entry: SourceRegistryEntry): SourceDefinition["kind"] {
  if (entry.kind === "directory") return "directory";
  if (entry.kind === "feed" || entry.kind === "newsletter" || entry.kind === "partner-feed") return "feed";
  return "organization-website";
}

/**
 * A directory page is a structured list of links. Deterministic parsing reads it
 * completely, so spending a model call there buys nothing — and directories are
 * the highest-volume source kind we have. The model is reserved for host pages,
 * where prose has to be understood rather than enumerated.
 */
export function adapterForSource(kind: SourceDefinition["kind"], modelAdapterId: string): string {
  if (kind === "feed") return "feed-v2";
  if (kind === "directory") return "generic-html-v2";
  return modelAdapterId;
}

export function sourceDefinitionFromRegistry(entry: SourceRegistryEntry, adapterId = "generic-html-v2"): SourceDefinition {
  const kind = sourceKind(entry);
  const schedule = scheduleForRegistry(entry, Boolean(entry.active && trustedSource(entry)));
  return {
    id: `registry-${entry.id}`,
    name: entry.name,
    url: entry.url,
    adapterId: adapterForSource(kind, adapterId),
    kind,
    geography: entry.geography ?? ["global"],
    opportunityTypes: entry.opportunityTypes,
    schedule,
    config: {
      destination: { pageRole: entry.tier === 0 ? "detail" : "landing", detailLimit: 5 },
      registrySourceId: entry.id,
      registryTier: entry.tier,
      registryVerticalId: entry.verticalId,
      trust: entry.trust,
      followsOutboundLinks: entry.followsOutboundLinks,
      schedule,
    },
  };
}

export function createIngestionCatalog(adapterId = "generic-html-v2"): IngestionCatalogEntry[] {
  return getRegistry().sources.map((entry) => {
    const trust = entry.trust;
    const eligible = trustedSource(entry);
    const skipReason = !entry.active ? "inactive" : trust?.status === "blocked" ? "blocked" : !eligible ? "needs-review" : undefined;
    return {
      ...sourceDefinitionFromRegistry(entry, adapterId),
      registryTier: entry.tier,
      trustStatus: trust?.status ?? "needs-review",
      trustScore: trust?.score ?? 0,
      active: entry.active,
      eligible,
      ...(skipReason ? { skipReason } : {}),
    };
  });
}

export function createWorkerSources(adapterId = "generic-html-v2"): SourceDefinition[] {
  return createIngestionCatalog(adapterId).filter((source) => source.eligible);
}
