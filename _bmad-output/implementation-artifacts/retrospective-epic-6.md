# Epic 6 Retrospective — Organization and Hosted Application Foundations

Date: 2026-08-27
Status: complete from a story/demo perspective; production certification partial

## Epic Review

Epic 6 delivered all six tracked stories: Organization/Program creation, linked
Open Calls, submission-path form building, public Organization pages, private
file upload, and applicant submission integrity/receipts.

### What worked

- Domain coverage is coherent end to end. The workspace suite now exercises the
  Team → Program → Open Call → form → Submission → Work chain, organization
  scoping, idempotent retries, withdrawals, payments, drafts, and persistence
  deltas.
- The hosted-application boundary fails closed. Uploads are account/path scoped,
  executable policy is local, Cloudmersive is explicit, ambiguous provider
  results are unavailable, and provider/threat details stay out of applicant
  copy.
- Review corrected a false-green provider test before shipping: the official
  API declares advanced controls as headers, not query parameters. Encoding the
  external wire contract in tests prevented recurrence.
- The complete workspace build, typecheck, lint, 41 runnable workspace tests,
  focused scanner/web tests, and isolated targeted browser flows passed.

### What did not close

- The local environment cannot certify the real Postgres migration/round trip,
  private Blob lifecycle, Cloudmersive provider call, Stripe reconciliation,
  Resend delivery, or container startup.
- A light runtime smoke unexpectedly loaded a local `DATABASE_URL` from Next
  configuration and created `story-6-6-runtime@example.test`. This exposed an
  environment-isolation weakness in manual/runtime validation.
- Parallel mutation-heavy E2E produced a seeded-login failure that passed when
  run alone. Shared demo-store state is not an intentional parallel contract.
- Production dependency audit reported 22 high and 7 moderate findings. Some
  suggested upgrades are breaking and `xlsx` had no fix in the audit result.
- Automated accessibility checks passed for exercised routes, but assistive
  technology, keyboard, high zoom, full fixture/viewport, performance, and load
  certification remain open.

## Key Lessons

1. Provider mocks must mirror the official transport contract, including where
   controls live, not merely return the expected JSON.
2. A green demo suite is not durable-infrastructure evidence. Database,
   provider, worker, and migration claims require a disposable production-like
   stack.
3. Runtime tests need explicit environment isolation; unsetting a shell variable
   is insufficient when framework configuration files may reload it.
4. Mutation-heavy Playwright flows must use per-worker stores or run serially;
   accidental shared-state concurrency creates misleading failures and passes.

## Action Items

### CRITICAL — production-like Epic 6 certification

Owner: platform/release engineering

- Provision an explicitly disposable staging stack with fresh Postgres, private
  Blob, Cloudmersive, Stripe test mode, Resend sandbox, Redis, and containers.
- Replay migrations from zero and run the real workspace schema/save/load test.
- Exercise clean/rejected/oversized/retry/replace/remove/cleanup upload paths,
  payment return/webhook/replay/refund/dispute paths, immutable receipts, and
  deadline/form-version races.
- Success: every provider/database path has retained evidence and no test uses
  production customer data or credentials.

### HIGH — isolate mutation-heavy E2E

Owner: web test infrastructure

- Give each Playwright worker an isolated store or mark the Epic 6 mutation
  project serial by design.
- Success: the targeted Epic 6 matrix passes repeatedly under its declared
  concurrency model without seeded-login flakes.

### HIGH — dependency remediation plan

Owner: application security and package maintainers

- Triage all 29 production-tree advisories, distinguish reachable from
  unreachable paths, upgrade non-breaking packages, and record mitigations or
  replacement decisions for breaking/no-fix dependencies.
- Success: no unexplained high advisory remains in the launch waiver ledger.

### HIGH — safe validation environment contract

Owner: developer experience

- Add a documented test-runtime configuration that refuses unidentified
  `DATABASE_URL`/provider credentials and supplies disposable fixtures.
- Success: runtime smoke cannot write to a developer or production database by
  accident.

### MEDIUM — remaining experience certification

Owner: QA/accessibility

- Complete keyboard, screen-reader, 200%/400% zoom, mobile/tablet, failure/retry,
  Lighthouse, and load-budget validation for hosted applications.

## Preparation for the Active Continuation Program

The historical next epic (Epic 7) is already marked done. The active tracked
continuation is Epic 15, beginning with Story 15.2. Before that work can be
treated as production closure:

- Keep provider delivery effects separate from compatibility audit hints.
- Require idempotent attempt/webhook convergence and provider-safe metadata.
- Use the disposable-stack contract above for real database/provider evidence.
- Do not let organization/admin UI imply delivered, paid, or durable state when
  the authoritative ledger/table is unavailable.

## Readiness Assessment

- Story completeness: PASS (6/6 done).
- Demo functional behavior: PASS in available isolated runs.
- Production infrastructure certification: PARTIAL.
- Deployment/stakeholder acceptance: not evidenced in repository artifacts.
- Gate before unrestricted launch: all CRITICAL items above.

