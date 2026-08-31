# ADR-003: Consolidate opportunity presentation around typed disclosure components

## Status

Proposed

## Date

2026-08-31

## Context

Missa has canonical public Opportunity routes, older card and detail compositions, and a separate design-review fixture. Their overlapping formatting and state logic makes it possible for the same deadline, fee, organization, or source state to be described differently. The redesign must deepen disclosure without replacing the repository, publication gate, URL state, or public transport allowlist.

## Options Considered

### Option A: Restyle the canonical pages in place

- Pros: smallest file count and immediate visual change
- Cons: mixes architecture, state modeling, visual work, and public-route risk; leaves the review fixture divergent

### Option B: Build another complete opportunity application

- Pros: unconstrained visual exploration
- Cons: creates a third authority, synthetic data contracts, and another migration problem

### Option C: Extract typed disclosure components and replace the existing review fixture first

- Pros: one reusable presentation language; deterministic edge-state review; no production-route change; supports data-equivalence tests
- Cons: canonical integration is deferred to a later phase

## Decision

We choose **Option C**. Phase 1 owns a reusable disclosure layer whose inputs are `OpportunityBrowseProjection` and `OpportunityDetailProjection`. The existing `/design-system/opportunities-overhaul` route becomes its deterministic reference composition. Canonical `/opportunities` routes remain unchanged until the Phase 2 migration gate.

Pages and repository reads remain Server Components. Components that require browser state or event handling form small Client Component boundaries. Public facts, source handoff, and private actions remain separate component responsibilities.

## Consequences

- The review surface may not invent a second opportunity data type.
- Formatting and unknown/conflict vocabulary live in shared disclosure helpers.
- Existing canonical card/detail components receive a Phase 2 merge-or-retire decision.
- A production presentation flag is not part of Phase 1.
- Phase 2 must prove repository projection equivalence before replacing canonical composition.
