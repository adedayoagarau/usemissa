/**
 * The production Radar graph. Nodes are intentionally coarse-grained lanes,
 * not autonomous writers with independent truth. Every handoff points back to
 * the same Neon opportunity row and an append-only agent run.
 */
export const RADAR_AGENT_GRAPH = {
  version: "1.1",
  nodes: [
    { id: "research", label: "Research", responsibility: "Discover candidate source pages across registry tiers." },
    { id: "discovery", label: "Discovery fan-out", responsibility: "Expand directories and feeds into bounded canonical call-page sources." },
    { id: "coverage", label: "Coverage gaps", responsibility: "Materialize taxonomy coverage cells and queue bounded discovery queries." },
    { id: "radar", label: "Radar", responsibility: "Fetch, validate, deduplicate, score, and project canonical opportunities." },
    { id: "enrichment", label: "Enrichment", responsibility: "Collect call profiles, guidelines, media, and winner evidence." },
    { id: "review", label: "Review", responsibility: "Apply publication checks and explain publish, suppress, or human-review decisions." },
    { id: "human-review", label: "Human review", responsibility: "Resolve ambiguous or incomplete candidates before publication." },
    { id: "publisher", label: "Publisher", responsibility: "Expose only approved opportunities through the public repository." },
    { id: "freshness", label: "Freshness", responsibility: "Recheck deadlines, status, source health, and stale evidence." },
  ],
  edges: [
    { from: "research", to: "discovery", kind: "directory-seed" },
    { from: "coverage", to: "discovery", kind: "gap-priority" },
    { from: "discovery", to: "radar", kind: "canonical-source" },
    { from: "radar", to: "enrichment", kind: "evidence-request" },
    { from: "radar", to: "review", kind: "review-request" },
    { from: "enrichment", to: "review", kind: "evidence-ready" },
    { from: "review", to: "publisher", kind: "publication-decision" },
    { from: "review", to: "human-review", kind: "needs-review" },
    { from: "freshness", to: "radar", kind: "refresh" },
    { from: "freshness", to: "review", kind: "re-review" },
  ],
} as const;

export type RadarAgentKind = (typeof RADAR_AGENT_GRAPH.nodes)[number]["id"];

export function agentGraphSnapshot(): typeof RADAR_AGENT_GRAPH {
  return RADAR_AGENT_GRAPH;
}
