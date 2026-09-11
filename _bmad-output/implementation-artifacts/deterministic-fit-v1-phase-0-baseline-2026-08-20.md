---
title: "deterministic-fit-v1 Phase 0 evidence and baseline"
type: "phase-0-evidence-artifact"
status: "complete-for-pre-production-replay-promotion-gated"
date: "2026-08-20"
policyVersion: "deterministic-fit-v1"
---

# deterministic-fit-v1 Phase 0 evidence and baseline

## Status

This is the Phase 0 evidence package. Phase 0 evidence/baseline work and the pure Phase 1 policy/replay implementation are complete for pre-production replay. No production serving path, personalized live ranking, or `deterministic-fit-v1` activation was added.

Phase 0 evidence and baseline review is **approved with open dependencies**. The execution state is `pre-production / replay-only / production-unverified`. Production truth remains unverified, the fixtures remain local/synthetic, and the known production/promotion dependencies remain separate gates for any later serving change.

## Repository and runtime evidence

| Field                             | Observation                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                        | `/Volumes/Crucial X10/usemissa`                                                                                                                   |
| Branch                            | `codex/first-save-focused-handoff`                                                                                                                |
| HEAD                              | `d88e0e3f4 fix(ingestion): Repair daily opportunity review loop`                                                                                  |
| `main`                            | `3ba7f0646 fix: keep ingestion v2 ids valid for public contracts`                                                                                 |
| Production credentials            | Local shell variables were absent on 2026-08-20; Railway `radar-worker` production `DATABASE_URL` was verified read-only on 2026-08-21.       |
| Production schema/runtime/traffic | Database schema/catalogue/runtime facts verified read-only through Railway; web traffic, HTTP latency, and account behavior remain unverified. |
| Execution state                   | Pre-production replay-only; no live ordering or shadow serving is active.                                                                       |
| Current fallback                  | Without `DATABASE_URL` and `MISSA_OPPORTUNITY_REPOSITORY=postgres`, `apps/web/lib/opportunityRepository.ts` selects the compatibility repository. |
| Existing dirty worktree           | Preserved. The modified recommendation research document and unrelated ingestion, Radar, design-system, and writing changes were not overwritten. |

The follow-up Railway verification is recorded in [`deterministic-fit-v1-phase-0-production-verification-2026-08-21.md`](./deterministic-fit-v1-phase-0-production-verification-2026-08-21.md). It confirms production catalogue facts without changing the approved pre-production/replay-only serving state.

The first production-catalogue replay is recorded in [`deterministic-fit-v1-phase-1-production-catalogue-replay-2026-08-21.md`](./deterministic-fit-v1-phase-1-production-catalogue-replay-2026-08-21.md). It is a Phase 1 evidence result, not a serving promotion.

## Current ranking paths frozen

### Compatibility path

Fixture: [`phase-0-compatibility-ranking-fixtures.json`](../../packages/radar-engine/test/fixtures/phase-0-compatibility-ranking-fixtures.json)

The current compatibility path:

- filters duplicate/archived/closed/duplicate/uncertain records;
- derives tailoring reasons from opportunity preferences, saved searches, taxonomy preferences, and selected Work taxonomy;
- limits reasons to four;
- sorts `recommended` by reason count descending, deadline ascending, and missing deadline last;
- paginates with a base64url integer offset;
- projects follow and Tracker state without using either in the recommended sort.

Local demo capture at `2026-08-20T12:00:00.000Z`:

| Account fixture   | Live candidates | Expected recommended order                                 |       Reason-bearing items |
| ----------------- | --------------: | ---------------------------------------------------------- | -------------------------: |
| Ada / `user_0001` |               5 | `opp_0004`, `opp_0001`, `opp_0002`, `opp_0005`, `opp_0003` | `opp_0004` only, 2 reasons |
| Ben / `user_0002` |               5 | `opp_0003`, `opp_0004`, `opp_0001`, `opp_0002`, `opp_0005` | `opp_0003` only, 2 reasons |

The results are baseline behavior, not a product recommendation judgment. In particular, a zero reason count does not mean a creator is a poor fit, and the current path does not provide four-state eligibility.

### PostgreSQL path

Fixture: [`phase-0-postgres-ranking-fixtures.json`](../../packages/radar-adapters/test/fixtures/phase-0-postgres-ranking-fixtures.json)

The current query builder emitted the following `recommended` order:

```sql
case when evidence.verified_until > now() then 0 else 1 end,
o.deadline_date asc nulls last,
o.processing_succeeded_at desc nulls last,
o.id asc
```

The query requires `publication_state = 'published'` and one of `opening-soon`, `open`, `closing-soon`, or `deadline-extended`. Taxonomy reads are disabled until the additive schema readiness check passes. The current cursor binds sort keys and ID but not account, policy version, feature version, taxonomy version, or a feed snapshot.

The PostgreSQL fixture rows freeze the expected order as:

```text
pg_verified_earlier
pg_verified_later
pg_unverified_earlier
pg_unverified_no_deadline
```

This is a query-builder/fixture baseline only. It was not executed against production or a local PostgreSQL database.

## Baseline measurements

### Local compatibility fixture

The server demo world was built from `packages/radar-engine/src/fixtures/serverDemo.ts` and ticked at the fixed observation time above.

| Metric                          |        Result | Interpretation                                                                              |
| ------------------------------- | ------------: | ------------------------------------------------------------------------------------------- |
| Sources                         |             6 | Local demo source inventory.                                                                |
| Stored Opportunities            |             5 | Post-tick in-memory store.                                                                  |
| Live compatibility candidates   |             5 | After current compatibility filter.                                                         |
| Demo users/accounts             |             4 | Ada, Ben, organization representative, admin.                                               |
| Missing organization            |           3/5 | Current fixture field completeness, not a quality judgment.                                 |
| Missing deadline                |           0/5 | Current fixture only.                                                                       |
| Missing fee disclosure          |           0/5 | Current fixture only.                                                                       |
| Missing location                |           5/5 | Current compatibility demo does not provide location facts.                                 |
| Missing genres                  |           2/5 | Current fixture only.                                                                       |
| Missing submission URL          |           3/5 | Current fixture only.                                                                       |
| Local in-memory ranking p50     |     0.0047 ms | 1,000 repeated two-account ranking computations; not HTTP, database, or production latency. |
| Local in-memory ranking p95     |     0.0097 ms | Same limitation.                                                                            |
| Local in-memory ranking maximum |     0.1495 ms | Same limitation.                                                                            |
| Fallback selected               | Compatibility | No production/database environment variables were present.                                  |

### Coverage and missingness interpretation

The local demo is intentionally not representative. It has five live candidates, USD-denominated fees, incomplete location data, and no global creator/currency/timezone coverage. It cannot establish catalogue coverage, segment coverage, production latency, worker freshness, traffic, or fallback rate. The global corpus is therefore a separate Phase 0 artifact, not a claim about current catalogue data.

## Baseline behavior that must not silently change

- Anonymous/public browse remains readable without private matching context.
- The compatibility path remains the immediate fallback when PostgreSQL is unavailable or not selected.
- The PostgreSQL path retains its current publication/status gate, evidence freshness ordering, and cursor semantics during Phase 0 and Phase 1.
- A Save or Tracker action does not mutate recommendation order in the baseline.
- Analytics remains a projection and cannot authorize a Save, eligibility, or ranking decision.
- Local prototype routes remain review-only and are not evidence of product or production behavior.

## Phase 0 artifacts

| Artifact                                                                                                                                     | Purpose                                                                                    | Review state                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [`phase-0-compatibility-ranking-fixtures.json`](../../packages/radar-engine/test/fixtures/phase-0-compatibility-ranking-fixtures.json)       | Freeze current in-memory/compatibility ordering and offset pagination.                     | Approved; local baseline.                                |
| [`phase-0-postgres-ranking-fixtures.json`](../../packages/radar-adapters/test/fixtures/phase-0-postgres-ranking-fixtures.json)               | Freeze current PostgreSQL order clause, gates, cursor limitation, and synthetic row order. | Captured; production execution unverified.               |
| [`phase-0-global-evaluation-corpus.json`](../../packages/radar-engine/test/fixtures/phase-0-global-evaluation-corpus.json)                   | Representative global creator/Opportunity fixtures and expected invariant cases.           | Approved for Phase 1 replay; expansion remains possible. |
| [`deterministic-fit-v1-phase-0-signal-ownership-review-2026-08-20.md`](./deterministic-fit-v1-phase-0-signal-ownership-review-2026-08-20.md) | Ownership, privacy, retention, provenance, and undo decisions.                             | Approved with open production/promotion dependencies.    |
| [`003-deterministic-fit-v1-policy-boundary.md`](../../docs/decisions/003-deterministic-fit-v1-policy-boundary.md)                            | ADR separating eligibility, relevance, confidence, diversity, and explanation.             | Accepted for Phase 1 implementation.                     |

## Phase 0 review outcome

The Phase 0 review is approved. The following limitations remain recorded and must be resolved or explicitly re-approved before any live shadow or serving promotion:

1. Production schema/runtime truth is verified read-only when credentials are available, or the missing evidence is explicitly accepted as a blocker.
2. Compatibility and PostgreSQL baseline fixtures are reviewed against current source and, where possible, observed runtime output.
3. The corpus covers global geography, currencies, time zones, participation modes, creator stages, interdisciplinary practices, incomplete inputs, evidence uncertainty, accessibility, preparation, funding, cross-border rules, duplicate concentration, and safety/lifecycle states.
4. Signal owners approve canonical source, origin, observation/effective time, version, confidence, permitted use, sensitivity boundary, retention, deletion, and undo for every creator signal.
5. The ADR is reviewed by product, engineering, privacy, and data owners.
6. Baseline ranking, latency, missingness, coverage, and fallback are recorded with exact predicates and environment labels.

Phase 1 pure policy/replay work is now being validated in pre-production. Do not invoke shadow evaluation, change onboarding, or change live ranking until the separate Phase 1 exit and promotion gates pass.

## Capture provenance

The following source hashes were captured with `sha256sum` on 2026-08-20:

| File                                                   | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/web/lib/opportunityRepository.ts`                | `6e3ccc1dad96f2218a2514c31938e994ac2f269a1e9588ab285af35bbd9c431e` |
| `packages/radar-engine/src/matching/matching.ts`       | `f16923c69f26dfc7e396adb52fcbb70e8c06b356102432b1e077c78cec179453` |
| `packages/radar-engine/src/fixtures/serverDemo.ts`     | `05f5097aeabfb7926a7ae61ac8633e9b9e9bfba7adaff4ea053631105b9a4412` |
| `packages/radar-adapters/src/opportunityRepository.ts` | `e3372b6ee45776c792d9606ef907251512f9595060719505894b4e84dea79258` |

## Commands run

```text
npm run build --workspace=@missa/radar-engine  PASS
npm run build --workspace=@missa/radar-adapters PASS
npm test --workspace=@missa/radar-engine  PASS: 136 passed
npm test --workspace=@missa/radar-adapters FAIL: 142 passed, 1 failed, 2 skipped
node --test packages/radar-adapters/dist/test/opportunityRepository.test.js PASS: 9 passed
Phase 0 JSON invariant checks PASS: 3 files, 10 creators, 18 Opportunities, 14 expected cases
```

The adapter suite failure is the existing `Sundance deadlines emits current official application cards` test in `dist/test/machineDiscoveryAdapters.test.js:16`; actual output was `[]` while the fixture expected `Graton Artist Opportunity`. It is unrelated to the Phase 0 artifacts and was not repaired. The focused OpportunityRepository tests pass.

These builds and tests validate the pure Phase 1 implementation and Phase 0 artifacts; they do not activate the Phase 1 policy or change serving order.
