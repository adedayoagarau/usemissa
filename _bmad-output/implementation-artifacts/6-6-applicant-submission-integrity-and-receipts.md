---
epic: 6
story: 6.6
status: done
title: Applicant submission integrity and receipts
---

# Story 6.6: Applicant submission integrity and receipts

## Goal

Make the Missa-hosted submission path preserve the applicant's actual form
response and connect a successful submission to the submitter's Tracker.

## Delivered in this slice

- Submission records now persist category and answers keyed by the saved form
  field IDs.
- The applicant form supports multiple Works and renders category-select fields
  as selects instead of generic text inputs.
- Paid checkout keeps a browser and server-backed draft so a Stripe return or
  second device can restore answers, work titles, and uploaded private files.
- Successful submissions expose a private receipt and a private `My submissions`
  list, scoped to the authenticated account.
- A Missa-hosted call linked to a Radar opportunity moves the submitter's Tracker
  item to `submitted` with a source note.
- New open calls can optionally link to a claimed Radar opportunity from the
  Workspace create flow.
- Submission retries accept an `Idempotency-Key` and return the original receipt
  rather than creating a second packet; the relational proposal includes the
  corresponding scoped unique index.
- Applicants can withdraw an undecided submission from its receipt; linked
  Tracker state follows the withdrawal.
- Organization reviewers can stream private Vercel Blob files through an
  organization-scoped endpoint instead of receiving an unprotected file URL.
- Drafts expire after 30 days and are removed when the submission succeeds.
- Uploads reject known executable content types, and final submission validates
  every file URL against the submitting account's private Blob prefix.
- Verified `checkout.session.completed` and async-success webhooks finalize a
  matching paid draft with event-idempotent processing, even when the applicant
  does not return to the browser.
- A scheduled, authenticated cleanup route deletes expired draft metadata and
  its private Blob uploads in bounded batches.
- Each Work can now carry multiple private file URLs; the organization file
  preview route authorizes and streams attachments individually.
- Payment lifecycle events are reconciled beyond success: expired/failed
  payments, refunds, and disputes are idempotently audited and reflected on
  the Submission payment status without hiding the receipt.
- Submission receipts and organization decisions emit private Inbox alerts;
  the existing bounded Resend digest can deliver them when configured.
- Uploads now run through a provider-backed malware scanner before private Blob
  storage; production fails closed when the scanner is missing or unavailable,
  while demo mode keeps the local executable-signature policy.

## Production certification follow-up

- Cloudmersive is selected and the production adapter is implemented. A staging
  operator must still configure the documented provider URL/key and run the
  clean/rejected-file smoke recorded in QA Results before launch certification.

## Validation

- Workspace engine tests: 33 total, 32 passed, 1 expected live-Postgres skip.
- Web typecheck: passed.
- Web lint: passed with two existing warnings in the opportunities API route.

## Tasks / Subtasks

- [x] Select and implement the Cloudmersive advanced malware-scan adapter at the pre-Blob upload boundary.
  - [x] Require explicit `cloudmersive` or `generic` provider selection and HTTPS configuration.
  - [x] Send Cloudmersive multipart `inputFile`, `Apikey` authentication, and explicit advanced threat controls.
  - [x] Parse provider responses conservatively and keep customer-facing failures provider- and threat-neutral.
- [x] Preserve the generic raw-body and optional Bearer-token adapter contract.
- [x] Add focused tests for demo fallback, configuration, URL validation, both provider contracts, errors, ambiguity, timeout, and secret-safe failures.
- [x] Document production configuration and align deployment readiness detection with the selected adapter.
- [x] Run focused scanner tests, web typecheck, and web lint.

## Dev Agent Record

### Implementation Plan

- Extend the existing pre-storage scanner boundary without changing its upload caller.
- Keep provider wire contracts isolated and parse both with explicit, fail-closed result rules.
- Normalize all provider-side rejection and availability reasons before they reach the route response.

### Debug Log

- The first red run confirmed generic provider reasons leaked upstream text and no Cloudmersive wire contract existed.
- The first typecheck caught an adapter-argument mismatch and `Buffer`/`BlobPart` typing incompatibility; both were corrected before completion.

### Completion Notes

- Added explicit `MALWARE_SCAN_PROVIDER=cloudmersive|generic`; partial, unknown, credential-bearing, non-HTTPS, and production-missing configuration fails closed.
- Added the Cloudmersive `/virus/scan/file/advanced` multipart adapter with `inputFile`, `Apikey`, original filename/content type, and explicit executable/script/macro/encrypted/invalid/unsafe-content controls.
- Cloudmersive is clean only for explicit `CleanResult: true`; explicit negative results, virus rows, or threat flags block. Ambiguous and failed responses are unavailable.
- Preserved the generic raw-byte, `Content-Type`, `X-Filename`, and optional Bearer-token contract.
- Provider error bodies, threat names, URLs, HTTP statuses, and credentials are never returned in scanner results; applicant-facing copy stays neutral.
- Updated readiness detection and operator configuration documentation.
- Live Cloudmersive certification remains PARTIAL until an operator supplies a real API key and runs the production-like upload smoke test.
- Review Round 1 item 1: moved all advanced Cloudmersive controls from URL query parameters into request headers beside `Apikey`; the request-shape test now asserts an unchanged, query-free configured endpoint and each control header.
- Review Round 1 item 2: added and tested the `allowUnsafeArchives: false` request header.
- Review Round 1 item 3: added `ContainsUnsafeArchive`, `ContainsOleEmbeddedObject`, and `ContainsUnwantedAction` to the fail-closed threat flags, with table-driven coverage proving each blocks with the normalized provider-safe reason.

### Validation Results

- `npx --no-install tsx --test apps/web/lib/malwareScanner.test.ts` — PASS (8/8).
- `npm run typecheck --workspace=@missa/web` — PASS.
- `npm run lint --workspace=@missa/web` — PASS with zero warnings.
- Unrelated Radar adapter tests were intentionally not run or modified per task scope.
- Review Round 1 red test: `npx --no-install tsx --test apps/web/lib/malwareScanner.test.ts` — expected FAIL (6/8 passed); request headers/URL contract and new threat flags failed before implementation.
- Review Round 1 focused test: `npx --no-install tsx --test apps/web/lib/malwareScanner.test.ts` — PASS (8/8).
- Review Round 1 web typecheck: `npm run typecheck --workspace=@missa/web` — PASS.
- Review Round 1 web lint: `npm run lint --workspace=@missa/web` — PASS with zero warnings.

## File List

- `apps/web/lib/malwareScanner.ts`
- `apps/web/lib/malwareScanner.test.ts`
- `apps/web/lib/readiness.ts`
- `ONBOARDING.md`
- `_bmad-output/implementation-artifacts/6-6-applicant-submission-integrity-and-receipts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-27: Added first-class Cloudmersive advanced scanning, retained the generic adapter, normalized customer-safe failures, added focused tests, and documented production configuration.
- 2026-08-27: Addressed all three Round 1 review findings: corrected advanced-control header transport, denied unsafe archives, and completed conservative Cloudmersive threat-flag parsing and tests.

## Review Notes

### Leader review — Round 1/2 (2026-08-27)

1. **Blocking — advanced controls use the wrong transport location.** In
   `apps/web/lib/malwareScanner.ts`, `scanWithCloudmersive` writes
   `allowExecutables`, `allowInvalidFiles`, `allowScripts`,
   `allowPasswordProtectedFiles`, `allowMacros`, `allowXmlExternalEntities`,
   `allowInsecureDeserialization`, and `allowHtml` into `url.searchParams`.
   Cloudmersive's official advanced-scan contract declares these controls as
   HTTP headers. Move every advanced control into the request headers beside
   `Apikey`; the URL must remain the configured endpoint without mutated query
   controls. Update the request-shape test to assert headers and the absence of
   injected query parameters.
2. **Blocking — unsafe archives are not explicitly denied.** The documented
   advanced contract includes `allowUnsafeArchives`, recommended `false`, but
   the adapter does not send it. Add the false-valued header and test it.
3. **Blocking — documented threat flags are incompletely parsed.** The parser
   omits `ContainsUnsafeArchive`, `ContainsOleEmbeddedObject`, and
   `ContainsUnwantedAction`. A contradictory or provider-evolved response with
   `CleanResult: true` and one of these flags could currently be accepted.
   Include all three in the conservative block list and add table-driven tests
   proving each flag blocks without leaking provider details.

The rest of the reviewed boundary is sound: explicit provider selection,
HTTPS/no-URL-credentials validation, missing-key failure, normalized reasons,
generic compatibility, abort behavior, and multipart filename/content type are
appropriate. Story remains `review` pending these fixes and revalidation.

## QA Results

### Functional validation — light (2026-08-27)

**VALIDATION: PARTIAL**

- **Build: PASS.** `npm run build --workspace=@missa/web` exited 0. Next.js
  16.2.12 compiled successfully, completed TypeScript and static generation,
  and emitted `/api/submission-paths/[pathId]/upload` in the production route
  manifest.
- **Runtime: PASS.** Started the built application with
  `npm run start --workspace=@missa/web -- --port 3416`; Next.js reported ready
  in 88 ms. `GET /api/health/readiness` returned HTTP 200 with
  `environment: "production"`. The non-secret report exposed no configuration
  values and reported `malwareScanning.state: "degraded"` while scanner
  configuration was absent.
- **Upload route wiring/auth boundary: PASS.** A multipart POST to
  `/api/submission-paths/nonexistent/upload` without a session returned HTTP
  401 and `{ "error": "Not authenticated" }`. With a valid locally-created
  session, the same request returned HTTP 404 and
  `{ "error": "Unknown submission form" }`, proving the built route imported,
  ran, parsed the session, and reached the workspace boundary. The smoke
  created account `story-6-6-runtime@example.test` in the database configured
  by the local Next.js environment; it did not create an upload or Blob object.
- **Production fail-closed scanner boundary: PASS.** With
  `VERCEL_ENV=production` and all three malware variables absent, direct
  invocation of the exact runtime scanner library for a benign
  `portfolio.pdf` returned only
  `{ "status": "unavailable", "reason": "File checking is temporarily unavailable" }`.
  No provider URL, token, response body, or internal error leaked.
- **Published-form HTTP scanner smoke: NOT RUN.** No safely disposable
  published submission-path fixture was available through the running app.
  The authenticated route therefore stopped at the unknown-form boundary; the
  HTTP 503 scanner response was not claimed.
- **Cloudmersive infrastructure: NOT CERTIFIED.** No real Cloudmersive API key
  was supplied, so multipart transport and a provider clean result were not
  exercised against the live service. This is the reason for `PARTIAL`.
- **Production-like follow-up:** on a staging host with a disposable published
  submission path, private Blob token, and Cloudmersive secret configured as
  documented in `ONBOARDING.md`, run:
  `curl -i -b <authenticated-cookie-jar> -F 'file=@<known-clean-fixture.pdf>;type=application/pdf' https://<staging-host>/api/submission-paths/<published-path-id>/upload`.
  Require HTTP 201 with `scan.status: "clean"` and `scan.engine: "provider"`,
  then repeat with an operator-approved malware test fixture and require HTTP
  422 with only the normalized applicant-safe reason. Confirm the rejected
  fixture created no Blob object.
- Unit tests were intentionally not repeated in light mode; the reviewed
  focused scanner suite already passed 8/8.

### Full Epic 6 validation (2026-08-27)

**FULL EPIC VALIDATION: PARTIAL**

- **Scope and environment.** Validated Stories 6.1–6.6 as a Next.js 16
  UI/frontend application with the full-mode UI, security, container,
  accessibility, and performance playbooks. The test processes had no
  `DATABASE_URL`, private Blob token, Stripe secret, malware provider, or
  working Docker CLI. No production provider calls, charges, uploads,
  migrations, or persistent test records were created. The previously noted
  `story-6-6-runtime@example.test` account was not accessed or modified.
- **Production build: PASS.** `npm run build` exited 0 for all eight workspace
  packages. Next.js compiled in 12.7 s, TypeScript completed, all 201 static
  pages generated, and the production route manifest included the complete
  organization/open-call/submission-path/upload/draft/checkout/submit,
  receipt, withdrawal, organization-file, Stripe-webhook, and cleanup surface.
- **Type/lint gates: PASS.** `npm run typecheck --workspace=@missa/web` and
  `npm run lint --workspace=@missa/web` both exited 0.
- **Workspace domain/integration suite: PASS with infrastructure skip.**
  `npm test --workspace=@missa/workspace-engine` reported 42 tests: 41 passed,
  0 failed, and 1 skipped. The passing cases covered the complete
  Team -> Program -> Open Call -> form -> Submission -> Work chain,
  organization scoping, published-call lookup, non-empty Works, retry
  idempotency, withdrawal restrictions, payment lifecycle reconciliation,
  draft ownership/expiry, imports, and delta persistence. The skipped case was
  the real-Postgres schema/save/load round trip.
- **Focused web boundaries: PASS; one test-harness incompatibility.** Direct
  `tsx --test` execution passed 18 focused malware, organization-product,
  organization-workflow, and public-profile assertions, including all 8
  malware-scanner contracts. The admin organizations Route Handler test could
  not load under this direct root-level harness because the `@/lib` tsconfig
  alias was unresolved (`ERR_MODULE_NOT_FOUND`); this is a harness invocation
  limitation, not a failing assertion, and the production Next.js build did
  resolve the same route.
- **Browser/E2E main paths: PASS in isolation; concurrency warning.** The
  targeted Playwright matrix covered `submissions`, organization authorization
  and responsive tenant isolation, organization opportunity/form surfaces,
  public organization visibility, hosted-application product behavior, and
  hosted-application field/mobile/receipt directions. The parallel run passed
  16/17; the cross-role organization-decision-to-receipt test received a
  non-OK seeded-admin login while seven specs used five workers. Re-running
  that exact test alone passed (1/1, 11.8 s). Treat this as a shared demo-store
  concurrency/test-isolation warning: CI should run the mutation-heavy Epic 6
  suite with one worker or give each worker an isolated store, then prove the
  parallel contract intentionally.
- **Accessibility: PASS for automated critical/serious checks exercised.** The
  selected hosted application, organization, public organization, opportunity,
  and submission E2Es include `@axe-core/playwright`; all executed assertions
  passed, including mobile layouts and field/error associations. Manual screen
  reader, full keyboard, 200/400 percent zoom, and every required fixture and
  viewport from the hosted-application contract remain launch QA gates.
- **Security: WARNING.** `npm audit --omit=dev --audit-level=high` reported 29
  production-tree findings (22 high, 7 moderate), including high findings in
  `brace-expansion`, `fast-uri`, `ip-address`, `js-yaml`, `nanoid`, `postcss`,
  `sharp`, `undici`, and `xlsx`; `xlsx` has no published fix in the audit
  result, while several suggested upgrades are breaking. A tracked-source
  heuristic scan for common live-key/private-key signatures found 0 candidate
  files. `gitleaks`/Semgrep were unavailable, so this is not a complete secret
  or SAST certification.
- **Container: NOT RUN.** A `Dockerfile` and
  `docker-compose.ingestion-v2.yml` exist, but no working Docker executable was
  available (`docker`/`docker compose` exit 127). Reproducible image build,
  Dockerfile lint, container startup/health, worker connectivity, image size,
  and Compose service health remain unverified.
- **Performance: WARNING/BASELINE ONLY.** The successful `.next` output occupied
  1.9 GB including build caches/server artifacts. The largest emitted static
  JavaScript chunks were approximately 772 KB (two chunks), 608 KB, 568 KB,
  and 560 KB. No approved bundle budget/baseline, Lighthouse run, staging
  latency sample, or load test was available, so no performance pass is
  claimed.
- **Durable infrastructure: NOT CERTIFIED.** Per `ONBOARDING.md`, the runtime
  still dual-runs compatibility snapshots and relational projections. With no
  explicitly disposable Postgres database, migrations and the real
  schema/save/load round trip were deliberately not attempted. Likewise, no
  production-like private Vercel Blob upload/download/deletion lifecycle,
  Cloudmersive clean/rejected fixture, Stripe paid/cancelled/failed/refund/
  dispute webhook reconciliation, Resend delivery, deadline race, or cleanup
  worker was exercised against live infrastructure.
- **Remaining launch gates.** On an isolated staging stack: replay migrations
  into a fresh disposable Postgres database; run Epic 6 mutation E2Es serially
  and with deliberately isolated parallel workers; exercise clean, rejected,
  oversized, retry, replace, remove, and cleanup Blob/Cloudmersive paths;
  certify Stripe redirect and replay/reconciliation states without a real
  charge; verify immutable complete receipts and deadline/form-version races;
  run container health, full secret/SAST tooling, dependency remediation,
  Lighthouse/load budgets, and manual keyboard/screen-reader/mobile/zoom/
  failure/retry QA. Until those pass, Epic 6 is functionally demonstrated in
  demo mode but is not a production-database/provider certification.
