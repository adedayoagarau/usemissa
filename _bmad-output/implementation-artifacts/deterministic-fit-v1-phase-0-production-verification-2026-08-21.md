---
title: "deterministic-fit-v1 Phase 0 production read-only verification"
type: "phase-0-production-evidence-artifact"
status: "verified-read-only-with-open-dependencies"
date: "2026-08-21"
policyVersion: "deterministic-fit-v1"
environment: "production-database-read-through-railway"
servingState: "pre-production / replay-only / production-verified-for-read-only-facts"
---

# deterministic-fit-v1: production read-only verification

## Scope and safety boundary

On 2026-08-21, production database access was verified through the Railway `radar-worker` service. The checks used the injected `DATABASE_URL` and a PostgreSQL `BEGIN READ ONLY` transaction. They performed no inserts, updates, deletes, migrations, deployments, ranking changes, or customer-facing recommendation calls.

This artifact verifies production facts about the database and catalogue. It does **not** mean that `deterministic-fit-v1` is production-serving. The policy remains `pre-production / replay-only`; production recommendation activation remains gated.

## Runtime and schema facts

| Fact | Verified observation |
| --- | --- |
| Railway project | `missa-production` |
| Service used as read-only credential conduit | `radar-worker` |
| Railway service status | `SUCCESS`, not stopped, deployment `a39fc2f8-6280-4c78-a708-a32785ae8b3d` at verification time |
| Worker mode | `MISSA_WORKER_MODE=radar` |
| Database | `neondb` |
| PostgreSQL | `17.10 (29ad1b7)` |
| Database role | `neondb_owner` |
| Transaction mode | `read_only=on` |
| Database clock | `2026-08-21T14:32:05.258Z` |
| Migration ledger | `drizzle.__drizzle_migrations`, migration IDs 7 through 28 present |
| Neon Auth tables | Present under `neon_auth` |
| Neon Auth records | `user=0`, `session=0`, `account=0` |
| Recommendation serving | No live policy invocation was performed or enabled |

The production schema is therefore reachable and has the canonical Opportunity, version, source, taxonomy, profile, Tracker, analytics, and migration tables. The empty Neon Auth counts mean real Neon Auth account behavior is still not demonstrated by this database snapshot.

## Catalogue scale and current public pool

The PostgreSQL repository defines the public pool as `publication_state = 'published'` plus statuses `opening-soon`, `open`, `closing-soon`, and `deadline-extended` ([`packages/radar-adapters/src/opportunityRepository.ts:L114-L119`](../../packages/radar-adapters/src/opportunityRepository.ts#L114-L119), [`L522-L526`](../../packages/radar-adapters/src/opportunityRepository.ts#L522-L526)). The production counts at verification time were:

| Measure | Count |
| --- | ---: |
| `opportunities` | 3,249 |
| `opportunity_versions` | 5,510 |
| `opportunity_sources` | 4,911 |
| `opportunity_source_evidence` | 3,249 |
| Published Opportunities | 671 |
| Published/open pool | 668 |
| Opening soon | 1,354 |
| Open | 1,037 |
| Closing soon | 162 |
| Deadline extended | 9 |
| Closed | 684 |
| Archived | 3 |

Published/open type distribution:

| Type | Count |
| --- | ---: |
| Residency | 296 |
| Fellowship | 107 |
| Grant | 64 |
| Festival | 38 |
| Open call | 38 |
| Contest | 32 |
| Other | 23 |
| Magazine | 19 |
| Award | 17 |
| Conference | 15 |
| Scholarship | 10 |
| RFP | 7 |
| Pitch | 2 |

## Evidence completeness and policy readiness

The live catalogue is sufficient for a read-only baseline, but not yet sufficient to claim safe personalized fit across the required global cases:

| Signal or condition | Production observation | Policy consequence |
| --- | --- | --- |
| Fee | 470/668 have `fee_status=unknown`; 104 no-fee USD, 75 paid USD, and smaller EUR/GBP/CAD/KRW/AUD groups | Unknown fee must produce `needs_input`, never rejection. Creator currency is not safely available from the existing profile preference row. |
| Deadline timezone | 0/668 have a populated `deadline_timezone`; 298 exact, 275 date, 87 inferred, 4 unknown, 2 conflicting, 2 rolling | Timing explanations can use the canonical date, but timezone-sensitive eligibility remains incomplete. |
| Location/participation | 291/668 location values are missing; the remaining values did not expose remote, hybrid, or travel markers under the bounded classification query | Do not infer remote, onsite, travel, or creator residence. |
| Submission state | 612/668 are `missing`; 56 are `available` | Submission availability is separate from eligibility and must remain an evidence watchout. |
| Organization identity | 667/668 have no `organization_id` | Organization concentration/follow affinity cannot be trusted for most current records. |
| Taxonomy | 668/668 have assignments; 2,957 assignments are present, 2,771 inferred and 0 confirmed | Taxonomy can support low-confidence relevance/replay, not a confirmed hard exclusion without stronger authority. |
| Freshness | 260/668 refreshed within 7 days; 668/668 within 30 days; 0 stale/missing by the measured predicate | Freshness is currently measurable, but source authority and safety remain separate. |
| Source trust | Active source rows: 3,111 curated, 1,431 needs-review, 236 verified; all reported `health_status=unknown` | Trust and health are not interchangeable. Reviewable/unknown source evidence must reduce confidence, not silently qualify an Opportunity. |
| Safety/dispute authority | `opportunity_issue_reports` exists but has 0 rows. Publication review persists a `checks.gates.safety` value, but its rubric only checks whether `submission_state` is `unsafe`; it is not version-bound to `opportunity_versions` and does not model disputes/removals. | Treat publication-review safety as provisional evidence only. Canonical dispute/removal/safety authority remains unresolved. |

## Creator and action-signal state

| Store | Production observation |
| --- | --- |
| `profiles` | 1 row; no location, no genres, 1 discipline-bearing profile, 1 career-stage value, no non-empty eligibility JSON |
| `profile_preferences` | 1 row; 1 discipline-bearing row, no no-fee-only preference, no max-fee value, no location preference |
| `saved_searches` | 0 rows |
| `organization_follows` | 0 rows |
| `tracked_opportunities` | 15 rows: 13 `interested`, 2 `preparing` |
| `tracked_status_events` | 17 rows |
| `platform_analytics_events` | 1,517 rows |
| Recommendation events | No recommendation, impression, served, opened, saved, or dismissed event names were present in the observed analytics event inventory |

The current production data does not yet provide a representative creator-behavior corpus. Analytics cannot become recommendation authority, and the absence of Save events is not negative preference evidence.

## Existing storage gaps confirmed in production

`tracked_opportunities` contains account, Opportunity, status, and timestamps, but no `opportunity_version_id`, taxonomy snapshot, source evidence references, safety snapshot, policy version, or undo/clear provenance fields. `opportunity_versions` exists independently with 5,510 rows. This confirms the previously documented transactional Opportunity-version protection and durable recommendation provenance gaps; no migration is authorized by this verification.

`platform_analytics_events` has an idempotency index, but the observed event vocabulary does not include recommendation evidence. Analytics storage therefore provides infrastructure, not a recommendation contract.

## Publication review is not yet recommendation safety authority

Production contains `radar_review_jobs` and `radar_review_decisions`. Across the observed decision history, the persisted publication rubric reported 2,419 `safety=pass`, 2 `safety=fail`, and 5,322 decisions without a safety value. The current published/open pool did not have complete latest-review safety coverage in the read-only checks.

The repository rubric confirms the boundary: [`publicationRubric.ts`](../../packages/radar-adapters/src/publicationRubric.ts) defines the safety gate as `submissionState === 'unsafe'`; the durable publication trigger also checks unsafe submission state but does not establish a general dispute, removal, abuse, or source-safety lifecycle. `radar_review_jobs.input_version` is a text review input marker, while `opportunity_versions` is a separate version table; there is no direct `opportunity_version_id` on the review decision or Tracker record.

Decision: `radar_review_decisions.checks.gates.safety` may be imported into a later evidence adapter with its review timestamp and input marker, but it may not be treated as a current canonical safety clearance or used to turn all other `unknown` values into `eligible`.

## Current PostgreSQL baseline latency

The existing PostgreSQL `recommended`-equivalent query was run 20 times through the Railway-injected connection against a single connection and a 25-row limit. This is a database/network sample, not an HTTP or end-to-end production SLO:

| Measure | Result |
| --- | ---: |
| Minimum | 75.023 ms |
| p50 | 77.493 ms |
| p95 | 136.471 ms |
| Maximum | 137.146 ms |
| Single `EXPLAIN ANALYZE` execution | 5.453 ms |
| Single `EXPLAIN ANALYZE` planning | 1.685 ms |
| Single plan shared read blocks | 127 |

The serving path should retain this baseline until replay differences, query-plan variance, and end-to-end latency are measured against the actual web runtime.

## Updated Phase 0 disposition

Production schema and catalogue facts are now **verified read-only** through Railway. The following remain open and block personalized serving or shadow integration:

1. Real Neon Auth and account-without-Profile Tracker verification; the current Neon Auth schema has zero users.
2. Durable First-Save provenance, customer undo/clear, and transactional Opportunity-version protection.
3. Canonical dispute/removal/safety authority.
4. Representative creator corpus and recommendation event instrumentation.
5. Signal ownership for organization identity, inferred taxonomy, currency, location, and eligibility rules.
6. Browser CI baseline.

Phase 0 production evidence is therefore improved but not complete for policy promotion. The pure pre-production policy was subsequently replayed against the read-only catalogue and its current engineering closure is recorded in [`deterministic-fit-v1-phase-0-1-closure-2026-08-21.md`](./deterministic-fit-v1-phase-0-1-closure-2026-08-21.md); no production account or live request should be personalized yet.
