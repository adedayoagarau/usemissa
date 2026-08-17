import { getRegistry, trustedSource, type SourceRegistryEntry } from "@missa/radar-engine";
import type { SourceDefinition, SourceLane, SourceSchedule } from "./contracts.js";
import { FIRST_TRANCHE_SOURCE_MANIFEST, validateSourceManifest, type SourceManifestEntry } from "./sourceManifest.js";

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

export function sourceDefinitionFromRegistry(entry: SourceRegistryEntry, adapterId = "generic-html-v2"): SourceDefinition {
  const kind = sourceKind(entry);
  const schedule = scheduleForRegistry(entry, Boolean(entry.active && trustedSource(entry)));
  return {
    id: `registry-${entry.id}`,
    name: entry.name,
    url: entry.url,
    adapterId: kind === "feed" ? "feed-v2" : adapterId,
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

export type WorkerSourceSet = "first-tranche" | "all-registry";

function applyManifest(entry: SourceManifestEntry, registryEntry: SourceRegistryEntry, adapterId: string): SourceDefinition {
  const base = sourceDefinitionFromRegistry(registryEntry, adapterId);
  const sourceManifest = {
    id: entry.id, desk: entry.desk, role: entry.role, structure: entry.structure, access: entry.access,
    stableItemId: entry.stableItemId, artFormVerticalIds: entry.artFormVerticalIds,
    firstPartyDestinationRequired: entry.firstPartyDestinationRequired, publicationAuthority: entry.publicationAuthority,
    maxIndexPages: entry.maxIndexPages, maxChangedChildrenPerRun: entry.maxChangedChildrenPerRun, refresh: entry.refresh,
  };
  return {
    ...base,
    name: entry.name,
    url: entry.urlOverride ?? base.url,
    adapterId: entry.adapterId ?? (entry.kindOverride ? adapterId : base.adapterId),
    kind: entry.kindOverride ?? base.kind,
    schedule: { ...base.schedule, lane: "core-daily", cadenceHours: entry.refresh.baseCadenceHours },
    config: { ...base.config, ...entry.configOverride, sourceManifest },
  };
}

export function createFirstTrancheSources(adapterId = "generic-html-v2"): SourceDefinition[] {
  const errors = validateSourceManifest();
  if (errors.length) throw new Error(`Invalid ingestion v2 source manifest: ${errors.join("; ")}`);
  const byId = new Map(getRegistry().sources.map((entry) => [entry.id, entry]));
  return FIRST_TRANCHE_SOURCE_MANIFEST
    .filter((entry) => entry.runnable && entry.access !== "blocked" && entry.access !== "partner-required")
    .map((entry) => {
      const registryEntry = byId.get(entry.registrySourceId);
      if (!registryEntry) throw new Error(`Missing registry source for manifest entry ${entry.id}: ${entry.registrySourceId}`);
      return applyManifest(entry, registryEntry, adapterId);
    });
}

export function createWorkerSources(adapterId = "generic-html-v2", sourceSet: WorkerSourceSet = "first-tranche"): SourceDefinition[] {
  return sourceSet === "all-registry" ? createIngestionCatalog(adapterId).filter((source) => source.eligible) : createFirstTrancheSources(adapterId);
}
