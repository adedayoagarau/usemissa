import { getRegistry, trustedSource, type SourceRegistryEntry } from "@missa/radar-engine";
import type { SourceDefinition } from "./contracts.js";

export type IngestionCatalogEntry = SourceDefinition & {
  registryTier: SourceRegistryEntry["tier"];
  trustStatus: string;
  trustScore: number;
  active: boolean;
  eligible: boolean;
  skipReason?: "inactive" | "blocked" | "needs-review";
};

function sourceKind(entry: SourceRegistryEntry): SourceDefinition["kind"] {
  if (entry.kind === "directory") return "directory";
  if (entry.kind === "feed" || entry.kind === "newsletter" || entry.kind === "partner-feed") return "feed";
  return "organization-website";
}

export function sourceDefinitionFromRegistry(entry: SourceRegistryEntry, adapterId = "generic-html-v2"): SourceDefinition {
  const kind = sourceKind(entry);
  return {
    id: `registry-${entry.id}`,
    name: entry.name,
    url: entry.url,
    adapterId: kind === "feed" ? "feed-v2" : adapterId,
    kind,
    geography: entry.geography ?? ["global"],
    opportunityTypes: entry.opportunityTypes,
    config: {
      destination: { pageRole: entry.tier === 0 ? "detail" : "landing", detailLimit: 5 },
      registrySourceId: entry.id,
      registryTier: entry.tier,
      registryVerticalId: entry.verticalId,
      trust: entry.trust,
      followsOutboundLinks: entry.followsOutboundLinks,
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
