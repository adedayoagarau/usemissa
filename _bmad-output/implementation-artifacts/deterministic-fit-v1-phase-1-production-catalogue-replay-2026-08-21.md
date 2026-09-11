---
title: "deterministic-fit-v1 Phase 1 production-catalogue replay"
type: "phase-1-replay-artifact"
status: "pre-production-replay-complete-phase-1-engineering-closed-serving-blocked-by-evidence"
date: "2026-08-21"
policyVersion: "deterministic-fit-v1"
executionState: "pre-production / replay-only / production-catalogue-verified"
---

# deterministic-fit-v1: production-catalogue replay

## Decision

The pure policy was replayed against 679 production published/open Opportunities through a Railway read-only connection. The pool is mutable; the earlier Phase 0 snapshot contained 668 rows. The replay is deterministic and has zero confirmed eligibility violations, but it is **not promotion-ready**: the current canonical evidence shape yields zero `eligible` candidates in every scenario because safety authority is unknown for every candidate and other required fields are incomplete.

This is the expected fail-closed result for the current production evidence. It does not authorize a live personalized feed and does not mean that the Opportunities are universally ineligible.

## Method

- Input pool: production `opportunities` where `publication_state = 'published'` and status is one of `opening-soon`, `open`, `closing-soon`, or `deadline-extended`.
- Candidate evidence: production Opportunity, latest Opportunity version, source, latest source evidence, taxonomy assignments, and eligibility rules.
- Safety: explicitly `unknown` because no canonical safety/dispute authority was found; this was not defaulted to clear.
- Creator contexts: synthetic, private, and account-free representative scenarios. No production Profile or user identity was loaded into the replay.
- Serving state: `pre-production / replay-only / production-catalogue-verified`; live runtime and serving remain unverified.
- Output: aggregate counts only; no Opportunity IDs or private account data were persisted.

Implementation: [`productionReplay.ts`](../../packages/radar-adapters/src/recommendation/productionReplay.ts).

## Results

| Scenario | Candidates | Eligible | Ineligible | Unknown | Deterministic | Confirmed eligibility violations | Explanation failures | Missing feature observations |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| Emerging, writing, no-fee, remote preference | 679 | 0 | 219 | 460 | Yes | 0 | 0 | 6,037 |
| Interdisciplinary, global, remote/hybrid preference | 679 | 0 | 155 | 524 | Yes | 0 | 0 | 6,797 |
| Established, travel-flexible preference | 679 | 0 | 155 | 524 | Yes | 0 | 0 | 6,118 |

Mean scores are diagnostic only and remain hypothesis outputs, not acceptance probabilities:

| Scenario | Mean relevance score, 0–1000 | Mean score confidence, 0–1000 |
| --- | ---: | ---: |
| Emerging, writing, no-fee, remote preference | 175.0722 | 494.4919 |
| Interdisciplinary, global, remote/hybrid preference | 338.3962 | 460.7467 |
| Established, travel-flexible preference | 320.6480 | 464.7364 |

The baseline order differs because the policy produces no eligible order. `movedCount=0` is therefore not evidence of ranking agreement; the policy order is empty after eligibility gates and the baseline remains the only usable catalogue order.

## Interpretation

The replay proves the following:

- Deterministic evaluation works against the production catalogue shape.
- Explanation derivation has no faithfulness failures in these scenarios.
- No candidate with `ineligible` state received a positive relevance score.
- Unknown evidence remains `unknown`; it does not become an inferred rejection.
- Current production evidence is not sufficient to produce a trustworthy eligible feed.

The replay does **not** prove:

- that the initial weights are correct;
- that production creator preferences are representative;
- that the current canonical safety authority is complete;
- that production HTTP latency or traffic matches the database sample;
- that any live customer should receive personalized ordering.

## Phase 1 engineering exit assessment

The pure Phase 1 implementation and replay gates are closed for engineering review. The global corpus now executes 14 golden cases, including safety-clear fixtures, contradictory evidence, stale evidence, preparation shortfall, and duplicate concentration. Unknown evidence remains separate from confirmed hard mismatches, and the current catalogue order remains the independent fallback.

The following remain promotion gates rather than unfinished replay implementation:

1. Resolve and verify the canonical dispute/removal/safety authority. Publication-review safety decisions remain provisional until version-bound.
2. Reconcile production ownership for taxonomy certainty, location/participation, fee currency, submission state, organization identity, and deadline timezone.
3. Obtain curator approval of the corpus, explanations, concentration constraints, and testable weight hypotheses.
4. Keep the current catalogue order as the independent fallback; do not use this replay to change serving.

See [`deterministic-fit-v1-phase-0-1-closure-2026-08-21.md`](./deterministic-fit-v1-phase-0-1-closure-2026-08-21.md) and the [Phase 1 replay manifest](./deterministic-fit-v1-phase-1-replay-manifest-2026-08-21.json).
