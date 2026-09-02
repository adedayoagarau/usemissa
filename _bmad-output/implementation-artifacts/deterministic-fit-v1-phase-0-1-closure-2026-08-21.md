---
title: "deterministic-fit-v1 Phase 0 and Phase 1 closure"
type: "phase-0-1-closure-artifact"
status: "engineering-complete-pre-production-promotion-blocked"
date: "2026-08-21"
policyVersion: "deterministic-fit-v1"
executionState: "pre-production / replay-only / production-catalogue-verified"
---

# deterministic-fit-v1: Phase 0 and Phase 1 closure

## Decision

Phase 0 evidence/baseline and Phase 1 pure policy/replay implementation are complete for the approved pre-production scope. The existing compatibility and PostgreSQL serving orders remain authoritative. `deterministic-fit-v1` is not active, not shadow-served, and not used to personalize live requests.

This is an engineering closure, not a production-promotion approval. The remaining dependencies below are explicit gates for any later shadow or serving work.

## Phase 0 closure

| Gate | Evidence | Result |
| --- | --- | --- |
| Current behaviour measurable | Compatibility and PostgreSQL ranking fixtures | Complete; both paths remain separate |
| Production schema/runtime read truth | Railway `radar-worker`, `BEGIN READ ONLY`, PostgreSQL 17.10, migration ledger, catalogue counts | Complete for database/catalogue facts; HTTP/auth parity remains unverified |
| Representative corpus | 10 creators, 18 Opportunities, 14 golden cases, global currencies/timezones/participation/safety/lifecycle dimensions | Complete and executable |
| Signal ownership/privacy/retention/undo | Signal ownership review, First-Save provenance contract, ADR-003 and ADR-004 | Complete for pre-production contract; durable production storage and canonical safety ownership remain open |
| Baseline metrics | Catalogue scale, missingness, query latency sample, coverage, fallback, worker state | Complete with environment labels and limitations |
| No ranking change | Repository search and serving-path review | Confirmed; policy invocation exists only in pure tests/replay |

## Phase 1 closure

Implemented and validated:

- Pure versioned policy types and pre-production execution states in `@missa/radar-engine`.
- Eligibility gates with explicit four-state semantics, version-bound safety authority, unknown/conflict handling, preparation watchouts, and confirmed-only hard exclusions.
- Versioned feature contributions, denominator-aware normalization, relevance scoring, separate confidence, diversity/concentration reranking, stable tie-breaking, and contribution-derived explanations.
- Independent baseline fallback and account-bound, policy-versioned feed snapshots.
- Canonical creator and Opportunity evidence adapters in `@missa/radar-adapters`.
- First-Save provenance containing Opportunity version, source snapshot, taxonomy/source references, safety decision references, and reversible clear semantics.
- Global corpus replay, safety-authority fixtures, deterministic replay reports, and policy manifest.
- Read-only replay against 679 published/open production Opportunities using synthetic account-free contexts; the earlier Phase 0 snapshot contained 668 rows because the catalogue is mutable. No private production creator data was loaded.

## Production integration harness

`runRecommendationHarness` in `@missa/radar-engine` is the approved integration boundary for replay and future shadow diagnostics. It computes policy results, ordering diffs, counts, determinism, account binding, and replay evidence while returning the existing baseline IDs as the only served order. It rejects `active` execution by construction. No current web route imports or invokes it.

This makes production wiring reversible and observable when the promotion gates are later closed, without making the current unstable evidence shape customer-facing.

## Version-bound storage contract

The next readiness slice is recorded in [ADR-005](../../docs/decisions/005-deterministic-fit-v1-evidence-storage-contract.md) and implemented as a non-migrating contract in `packages/radar-adapters/src/recommendation/evidenceStorage.ts`. It defines dedicated signal and evidence-event tables, deterministic signal IDs, account isolation, idempotency, clear-with-history behavior, and a read-only PostgreSQL readiness probe. The probe currently reports `unavailable`; no analytics table is used as recommendation authority and no production rows were written.

## Replay results

| Invariant | Result |
| --- | ---: |
| Global golden cases | 14/14 pass |
| Corpus dimension checks | pass |
| Confirmed eligibility violations | 0 |
| Explanation faithfulness failures | 0 |
| Account isolation failures | 0 |
| Fallback invariant failures | 0 |
| Pagination/snapshot invariant failures | 0 |
| Production-catalogue replay determinism | pass for all three scenarios |
| Production-catalogue explanation failures | 0 |
| Production-catalogue confirmed eligibility violations | 0 |

The production catalogue replay returns zero eligible rows because canonical safety authority is unknown for the current rows. This is the intended fail-closed result, not evidence that all Opportunities are universally ineligible.

## Remaining promotion gates

These are not silently converted into implementation claims:

1. Canonical dispute/removal/safety authority must be version-bound and independently reviewed.
2. Opportunity-version protection must be transactional between Save revalidation and Tracker creation.
3. Durable recommendation provenance, event idempotency, retention, deletion propagation, and customer undo must be implemented in the approved storage path.
4. Real Neon Auth and Tracker behavior for accounts without completed Profiles must be verified.
5. Curator review must approve the corpus results, explanations, watchouts, concentration limits, and initial weight hypotheses.
6. Repository-wide browser CI baseline must be restored or explicitly accepted as a separate release dependency.

Until these gates are closed, the only valid serving state is `pre-production / replay-only` with the current catalogue order as fallback.

## Validation record

```text
npm test --workspace=@missa/radar-engine                         PASS
node --test packages/radar-engine/dist/test/corpusReplay.test.js PASS: 2
node --test packages/radar-adapters/dist/test/recommendation.test.js PASS: 3
npm run typecheck                                               PASS
npm run lint                                                    PASS
npx prettier --check _bmad-output/planning-artifacts/deterministic-fit-v1-phase-0-1-spec-2026-08-20.md PASS
git diff --check                                                PASS
```

The full adapter suite retains the known Sundance fixture failure (`Graton Artist Opportunity` expected, empty result actual). That unrelated fixture was not changed.

No schema, migration, production-data, deployment, live-ranking, onboarding UI, or external-vendor changes were made.
