import { createHash } from "node:crypto";
import type {
  RecommendationExecutionState,
  RecommendationFeedSnapshot,
  RecommendationSurface,
} from "./types.js";
import { PRE_PRODUCTION_REPLAY_STATE } from "./types.js";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]));
  }
  return value;
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export interface FeedSnapshotInput {
  accountId: string;
  surface: RecommendationSurface;
  query: unknown;
  context: unknown;
  orderedOpportunityIds: string[];
  generatedAt: string;
  ttlMs: number;
  policyVersion: RecommendationFeedSnapshot["policyVersion"];
  executionState?: RecommendationExecutionState;
}

export function createFeedSnapshot(input: FeedSnapshotInput): RecommendationFeedSnapshot {
  const queryHash = stableHash(input.query);
  const contextHash = stableHash(input.context);
  const generated = Date.parse(input.generatedAt);
  const expiresAt = new Date((Number.isFinite(generated) ? generated : Date.now()) + input.ttlMs).toISOString();
  const feedId = stableHash({
    accountId: input.accountId,
    surface: input.surface,
    queryHash,
    contextHash,
    policyVersion: input.policyVersion,
    orderedOpportunityIds: input.orderedOpportunityIds,
    generatedAt: input.generatedAt,
    executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
  });
  return {
    feedId,
    accountId: input.accountId,
    surface: input.surface,
    queryHash,
    contextHash,
    policyVersion: input.policyVersion,
    orderedOpportunityIds: [...input.orderedOpportunityIds],
    generatedAt: input.generatedAt,
    expiresAt,
    executionState: input.executionState ?? PRE_PRODUCTION_REPLAY_STATE,
  };
}

export function createBaselineFallbackSnapshot(input: Omit<FeedSnapshotInput, "policyVersion">): RecommendationFeedSnapshot {
  return createFeedSnapshot({
    ...input,
    policyVersion: "baseline",
    executionState: {
      ...(input.executionState ?? PRE_PRODUCTION_REPLAY_STATE),
      servingMode: "baseline",
    },
  });
}
