# ADR-003: Establish a deterministic recommendation policy boundary before personalization

## Status

Accepted — Phase 0 review approved; Phase 1 pure implementation in pre-production

## Date

2026-08-20

## Context

Missa’s first-Save slice is complete as a local product slice, but the current Opportunity browse paths do not represent one recommendation policy. The compatibility path orders `recommended` by tailoring-reason count and deadline (`apps/web/lib/opportunityRepository.ts:L207-L225`), while the PostgreSQL path orders by verification freshness, deadline, processing freshness, and ID (`packages/radar-adapters/src/opportunityRepository.ts:L452-L463`). Their signal ownership and storage paths also differ.

The product requires public Opportunity reading to remain open, private creator context to remain account-bound, official sources and canonical Opportunity state to remain authoritative, and Save to remain an interest signal rather than eligibility, fit, application intent, submission, identity, acceptance, or outcome. Missing information must remain unknown, and explanations must be derived from the decision that produced them.

Phase 0 has established the local baseline fixtures, representative global corpus, ownership review, and policy boundary. Production truth remains unverified because credentials were unavailable. Phase 1 pure policy/replay code may run only in the pre-production replay-only state; no live ranking change is authorized by this ADR.

## Options considered

### Option A: Deterministic policy inside the existing TypeScript/PostgreSQL architecture

- Separate hard eligibility gates from relevance scoring.
- Keep evidence confidence separate from relevance.
- Apply diversity only after gates and scoring.
- Generate explanations from recorded feature contributions and gate facts.
- Replay against compatibility and PostgreSQL baselines before any shadow serving.
- Pros: inspectable, reproducible, reversible, compatible with current repository boundaries, and suitable for sparse or contradictory evidence.
- Cons: requires explicit taxonomy, evidence, ownership, and retention contracts; initial weights are hypotheses and need review.

### Option B: Learned or LLM-based ranker

- Pros: could discover nonlinear associations and reduce manual weighting later.
- Cons: requires trustworthy labels and durable provenance that Missa does not yet have; risks sensitive inference, opaque explanations, acceptance prediction, and accidental feedback loops from Save or exposure events.
- Rejected for Phase 0–1.

### Option C: External recommendation service, vector database, or feature store

- Pros: could provide managed retrieval, ranking, and scaling primitives.
- Cons: expands data residency, privacy, deletion, provenance, latency, operational, and rollback boundaries before current catalogue and signal ownership are measured.
- Rejected for Phase 0–1.

## Decision

Missa establishes `deterministic-fit-v1` as a versioned policy contract inside the existing TypeScript/PostgreSQL architecture. Its pure implementation is limited to pre-production replay and remains inactive in serving.

The policy boundary is:

```text
private creator context
  -> canonical published/open Opportunity pool
  -> dispute, safety, and hard-eligibility gates
  -> candidate/evidence provenance
  -> versioned features
  -> deterministic relevance
  -> separate evidence confidence
  -> diversity/concentration reranking
  -> contribution-derived explanation
  -> account-bound snapshot
  -> first-party evidence and offline replay
```

The policy returns four distinct outputs:

1. `eligibilityState`: `eligible`, `ineligible`, `needs_input`, or `unknown`.
2. `relevanceScore`: a bounded relevance measure, never acceptance probability or winner prediction.
3. `scoreConfidence`: completeness, freshness, provenance, and authority of evidence, independent from relevance.
4. `explanation`: positive reasons, watchouts, missing information, and exclusions derived from actual contributions and gates.

Phase 0 is approved as the gate for Phase 1 pure work. It froze current fixtures, created the global corpus, recorded local baseline ranking/latency/missingness/coverage/fallback, and documented signal ownership decisions. Phase 1 pure types, adapters, fixtures, replay reports, and diffs are being validated in pre-production; they must not change serving order.

## Consequences

### Positive

- Eligibility violations cannot be hidden by a high relevance score or diversity reranker.
- Unknown, stale, conflicting, and not-provided evidence remain observable rather than becoming negative preferences.
- Explanations can be tested for faithfulness because each reason has a contribution or gate provenance.
- Compatibility and PostgreSQL behavior remain measurable and reversible during transition.
- Account-bound snapshots can later guarantee one policy version through pagination.
- The existing catalogue remains an immediate fallback independent of recommendation evidence or analytics.

### Costs and constraints

- Phase 0 must complete ownership, privacy, retention, and provenance review before policy code is written.
- The current compatibility/PostgreSQL split remains in place during replay.
- Initial weights and thresholds are testable hypotheses, not product truths.
- Durable recommendation evidence, Opportunity-version protection, and canonical safety authority remain separate promotion dependencies.
- Acceptance or winner rate is not a primary KPI and cannot be used as a hidden training label in this phase.

## Non-goals

- No migration, production data write, deployment, live ordering change, onboarding UI, Profile publication, external vendor, vector database, Python serving layer, Kafka, feature store, LLM ranker, or acceptance predictor.
- No inference of protected or sensitive characteristics.
- No use of Save, Tracker progression, impressions, or notifications as eligibility authority.

## Review and rollback

Phase 0 review is approved with production verification and other promotion dependencies still visible. Phase 1 exit requires deterministic replay, zero confirmed eligibility violations, faithful explanations, acceptable curator review, independent fallback, and no live ordering change.

If a later approved activation fails, the active pointer rolls back to the current baseline or previous approved policy. Rollback must not delete evidence or mutate canonical Opportunity or Tracker state. Notifications, SSE, and digest workers remain invalidation/request mechanisms and never become recommendation or publication authority.
