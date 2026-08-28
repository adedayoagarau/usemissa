# Epic 15 Retrospective — Durable Support and Event Foundations

Date: 2026-08-27
Status: complete from a story and available-environment perspective; production certification partial

## Epic Review

Epic 15 completed all three tracked stories: durable support cases and issue
outbox, a durable outbound-message effect ledger with provider history, and
governed CRM, billing, and agent-control contracts.

### What worked

- The epic consistently promoted Postgres-backed, tenant-scoped records instead
  of extending snapshot or compatibility stores. Missing persistence now fails
  closed and renders as unavailable rather than as a healthy empty state.
- Side effects gained explicit identities and histories: support mutations write
  audit/outbox evidence transactionally; message intents, attempts, and verified
  provider events converge on one effect; CRM, billing, and agent requests use
  governed envelopes, append-only outcomes, and worker ownership.
- Review and correction cycles materially strengthened the implementation.
  They caught accepted-provider versus failed-finalization ambiguity, unsafe
  replay success, incomplete batch accounting, internal-recipient disclosure,
  provider-error leakage, billing actions without an executable reconciler,
  mutable Stripe receipt identity, CRM ownership ambiguity, and an agent reason
  missing from immutable request identity.
- Tests increasingly encoded the domain boundary rather than only the happy
  path. Final available-environment evidence passed the 202-page web build,
  TypeScript, ESLint, language checks, 13 database tests, 18 focused Epic tests,
  and four Playwright scenarios covering phone overflow, axe critical/serious,
  foreign-Organization isolation, and truthful unavailable states.
- Runtime smoke checks confirmed private/no-store and fail-closed behavior:
  unauthorized and non-admin access returned 401/403, unavailable durable
  mutations returned 503, unsigned Resend reconciliation returned 503, and an
  invalid Stripe signature returned 400 without external effects.

### What did not close

- Follow-up environment discovery found live Neon, Vercel, and Railway resources.
  Fresh replay initially exposed an incomplete Drizzle journal; after repair, all
  33 migrations replayed successfully and the 0028/0029 upgrade preserved legacy
  rows. Real-Postgres repository, message-concurrency, event-before-response, and
  agent-control lease/replay checks passed on isolated disposable databases.
- Provider lifecycle certification remains partial. Production reports email ready,
  but the CLI cannot retrieve a usable Resend secret for sandbox event generation;
  payments are degraded and the linked Vercel project has no Stripe variables.
- The full radar-adapters suite retains the unrelated Sundance fixture failure:
  162 tests passed, one failed, and two were skipped because the expected
  `Graton Artist Opportunity` record was absent.
- The production dependency audit still reports 22 high and 7 moderate findings.
  `gitleaks`, `semgrep`, and container scanning were unavailable, so targeted
  checks are not a full supply-chain or static-security certification.
- Some route tests cannot run standalone under the current alias/server-only
  harness and instead rely on build, focused pure-boundary tests, runtime smoke,
  and Playwright evidence.
- The generated `.next` output is approximately 2.0 GB and the largest JavaScript
  chunks are approximately 790 KB. There is no checked-in performance budget, so
  this is an observed risk rather than a certified regression.

## Key Lessons

1. Provider acceptance, durable finalization, delivery, and business completion
   are separate facts. A shared helper and explicit state reduction should exist
   before any producer is migrated.
2. Idempotency is an immutable business identity, not merely a unique key. It
   must bind every persisted semantic field, including normalized optional data,
   tenant, provider references, versions, and confirmation context.
3. Compatibility projections must never manufacture durable success or a healthy
   empty state. Durable and compatibility rows need separate labels and counts.
4. Privacy boundaries belong at persistence and projection edges. Provider
   diagnostics, audit data, and read models need the same allowlist/redaction
   policy, including legacy unsafe values read back from storage.
5. High-risk controls must be worker-owned and readiness-gated. Returning `202`
   for work no configured executor can safely reconcile creates stranded intent,
   not a governed operation.
6. Static schema parity and mocks establish design confidence, but only a
   disposable production-like stack can certify migration, locking, webhook
   ordering, retry, and reconciliation claims.

## Review Escapes and Process Improvements

The repeated review escapes were boundary errors rather than missing screens:
ambiguous external effects, incomplete immutable identities, unsafe projections,
and controls exposed before execution readiness. Future story creation and first
implementation review should use a mandatory contract matrix covering:

- authoritative grain, tenant scope, immutable replay identity, and conflict;
- request, transaction, provider, finalization, and reconciliation failure points;
- append-only evidence, privacy allowlists, and customer-visible vocabulary;
- unavailable, empty, in-progress, accepted, delivered, adverse, and ambiguous states;
- worker ownership, lease/expiry policy, and provider readiness;
- real-infrastructure evidence required to move from PARTIAL to PASS.

Pure route classifiers and provider-independent reducers were effective and should
remain the default seams for executable tests. Story task checkboxes should not be
closed until the named producer and failure-mode tests exist.

## Continuity from the Previous Available Retrospective

No Epic 14 retrospective artifact exists. The latest available retrospective is
Epic 6, whose critical production-like certification gate remains open. Epic 15
applied its fail-closed, provider-safe, and truthful-state lessons, but did not
close the shared disposable-stack, dependency-remediation, or safe validation-
environment actions. These are program-level launch gates, not Epic 15-only debt.

## Action Items and Gates

### CRITICAL — certify Epic 15 on disposable infrastructure

Owner: platform/release engineering

- Provision an explicitly identified disposable stack with Postgres, Redis where
  required, Resend sandbox, Stripe sandbox/CLI, and Docker.
- Replay all migrations from zero and upgrade from the pre-0028 state; exercise
  concurrent idempotency, row locks, claims, leases, expiration, and retries.
- Retain restricted evidence for accepted-to-delivered/bounced Resend flows and
  duplicate/out-of-order Stripe events, timeout ambiguity, refund lifecycle, and
  reconciliation.
- Success: every AC requiring real infrastructure has reproducible evidence and
  no developer or production customer resource is touched.

### HIGH — institutionalize the durable-effect contract matrix

Owner: architecture and story authors

- Add the matrix above to story templates and review checklists for every external
  side effect or governed mutation.
- Success: first review includes executable evidence for immutable identity,
  post-provider ambiguity, privacy, tenant isolation, truthful unavailable/empty
  states, and worker readiness.

### HIGH — resolve the full-suite Sundance failure

Owner: ingestion/Radar maintainers

- Repair or replace the stale Sundance fixture and retain a deterministic adapter
  regression.
- Success: the complete radar-adapters suite is green without excluding the
  affected source.

### HIGH — dependency and security-tool closure

Owner: application security and package maintainers

- Triage all 29 production-tree advisories, document reachability and mitigations,
  upgrade safe dependencies, and record replacement/waiver decisions for breaking
  or no-fix packages.
- Run repository secret and static analysis plus container build/scan in CI.
- Success: no unexplained high advisory remains and the launch evidence includes
  reproducible supply-chain, secret, static-analysis, and image results.

### MEDIUM — make route and performance gates first-class

Owner: web platform and performance engineering

- Provide a repository-supported harness for server-only/aliased route tests.
- Establish checked-in bundle/output budgets and investigate the approximately
  790 KB largest chunks and 2.0 GB build output.
- Success: focused route tests run directly in CI and performance regressions fail
  against an agreed baseline.

## Preparation for the Next Program Increment

No Epic 16 is defined in the current planning artifact. Before adding another
broad product epic, use the six launch-closure priorities already identified by
the product assessment to define a narrow, certifiable vertical slice. The next
increment should not depend on claims of durable message delivery, refund
execution, or autonomous agent processing until the CRITICAL infrastructure gate
above passes.

Recommended entry conditions:

- Postgres is the authoritative runtime path for the selected slice.
- Canonical product routes and explicit deferrals are documented.
- Provider workers and reconciliation contracts required by the slice are ready.
- The full relevant unit, Playwright, accessibility, retry, and production-like
  infrastructure gates are green or have explicit launch waivers.

## Readiness Assessment

- Story completeness: PASS (3/3 done).
- Available-environment functional behavior: PASS.
- Authorization, privacy, idempotency, and fail-closed boundaries: PASS in the
  exercised static, unit, runtime, and browser evidence.
- Production database/provider/container certification: PARTIAL.
- Dependency/security and performance certification: PARTIAL.
- Deployment and stakeholder acceptance: not evidenced in repository artifacts.
- Gate before unrestricted launch or a dependent epic: complete the CRITICAL
  disposable-infrastructure certification and disposition the HIGH risks above.
