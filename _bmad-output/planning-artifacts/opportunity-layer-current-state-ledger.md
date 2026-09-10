---
title: Missa Opportunity Layer Current-State Ledger
version: "0.1"
status: local-production-audit
audited_at: "2026-09-09"
evidence_boundary: Current local checkout only, plus dated repository audit documents. No claim here establishes production health, hosted database state, or domain promotion unless explicitly marked.
---

# Current-State Ledger

## Executive verdict

Missa has a broad, compiling product surface and a substantial opportunity/creator/organization model. It is not yet proven as one end-to-end opportunity layer. The largest gaps are cross-surface truth, production verification, freshness/correction SLOs, complete calendar/submission reconciliation, and a single versioned public opportunity contract.

## Evidence collected

| Check | Result | Boundary |
| --- | --- | --- |
| Root build | PASS — `npm run build` completed; all workspace TypeScript builds and Next production build completed | Local checkout; does not prove deployment or provider health |
| Local production-like start/probes | PASS — `NODE_ENV=production PORT=3210 npm run start --workspace=@missa/web`; `/`, `/methodology`, `/opportunities`, `/api/opportunities`, and `/api/health/readiness` returned 200; readiness reported database/session `ready` and optional providers `degraded` | Local running process against the current checkout/environment; proves compiled runtime and critical route behavior locally, not hosted alias health or provider durability |
| Web typecheck | PASS — `npm run typecheck` | Local TypeScript only |
| Design-system check | PASS — 58 Studio families, 790 variants, 17 semantic mappings, 4 instruction entrypoints, no new violations | Local validator; does not certify every visual state |
| Radar engine tests | PASS — 189 tests, 0 failures | Local package tests; does not prove hosted worker/database behavior |
| Creator migration boundary | PASS — `safe-to-rehearse`; 41 journal entries; additive 0045–0051 are guarded but intentionally unjournaled | Rehearsal and target-database readback still required; no migration was run |
| Railway project status | READ-ONLY access confirmed; `creator-worker`, `radar-worker`, ingestion, reconciliation, content, review, enrichment, and related services report latest `SUCCESS`; several v2/legacy services have no deployment | Deployment status is not worker heartbeat, queue throughput, database readback, or public health |
| Vercel `missa-app` | Latest production deployment inspected: **Error** because the configured build command invoked `repair-beta-creator-schema.cjs` without its explicit mutation flag; local `apps/web/vercel.json` now pins the build command to `npm run build` | Local config remediation is uncommitted/un-deployed; a new hosted deployment must prove the error is gone, but the current checkout is too broad to deploy without explicit scope approval |
| Current production alias probes | Alias still points to Ready deployment `dpl_3ZpLor6SQMRm63TrzbXnUDkdfRAg` (created Sep 6); `/` 200, `/methodology` 200, `/api/health/readiness` 200 with database/session/cron `ready`; `/opportunities` and `/api/opportunities` 500 (Next digest `1119340933`) | Public shell/readiness are live, but the canonical browse page and API are unhealthy; local fix is not deployed |
| Route inventory | 256 static/dynamic pages generated, including public discovery, creator, organization, admin, API, and design-system families | Route existence is not feature completion |
| Worktree | Heavily dirty with changes across UI, APIs, packages, migrations, docs, and generated/experimental surfaces | Existing user work preserved; no cleanup performed |
| Production evidence | Mixed and currently contradictory: Railway latest deployments mostly report `SUCCESS`, while the latest Vercel production deployment is `Error` | Config fix is prepared locally; still separately verify new deployment, database, worker heartbeat, public routes, and provider paths |

## Backend/Data lane

| Capability | Status | Evidence / next verification |
| --- | --- | --- |
| Opportunity contracts and repository | **Implemented, integration status mixed** | `packages/contracts`, `packages/radar-adapters`, `apps/web/app/api/opportunities`; run API contract/readback tests against the authoritative database |
| Source registry and ingestion | **Implemented, operational verification incomplete** | `packages/radar-engine`, `packages/ingestion-v2`, admin ingestion routes; Railway deployments exist for several workers, but current queues, leases, source runs, and publication readback remain unverified |
| Provenance/publication gates | **Implemented in model and policy, scale proof incomplete** | Schema contains evidence/source/freshness fields; re-run published-record audit and quarantine unsafe records |
| Creator persistence | **Broadly implemented, end-to-end maturity mixed** | Tracker, Library, applications, goals, reminders, following, recommendations, portfolio, calendar APIs exist; journal ends at `0042_missa_magazine_rankings` while additive creator migrations remain outside replay until rehearsal |
| Application preparation/submission | **Partially implemented** | Application workspace types/routes exist; external handoff must remain distinct from explicit submission confirmation and evidence |
| Organization workflow | **Broad API/route surface, production promotion incomplete** | Organization open calls, submissions, reviews, decisions, delivery, people, insights, imports, billing routes exist; run one real organization-scoped cycle before claiming operating-system readiness |
| Calendar/reminders | **Partial** | `docs/calendar-connected-workflow-readiness-2026-09-09.md` records missing source-deadline reconciliation and incomplete provider/readiness paths |
| Public distribution API/feeds | **Not proven as an external dependency** | API routes exist; no sustained partner consumption evidence recorded in this audit |
| Global source coverage | **Research/seed work, not scale-complete** | Africa ledger and education/fellowship map exist; source contracts, country evidence, and publication gates remain the scale boundary |

## Frontend/Product lane

| Surface | Status | Evidence / next verification |
| --- | --- | --- |
| Public discovery and detail | **Implemented, quality partial** | Routes and opportunity journey audits exist; re-run current desktop/mobile/keyboard/long-content checks against live data |
| Creator shell, onboarding, Tracker, Saved, Library, Profile | **Implemented, maturity mixed** | Routes/components exist; beta readiness records local/preview evidence and remaining hosted/device checks |
| Application preparation | **Prototype/local boundary** | `docs/application-preparation-design.md` explicitly says local state and no real persistence/submission integration |
| Applications and submissions | **Implemented surface, end-to-end proof incomplete** | Routes exist; validate real account persistence, handoff, confirmation, correction, and outcome paths |
| Organization UI | **Broad route/prototype surface, promotion incomplete** | Multiple organization routes and contracts exist; several documents label local/read-only or production-blocked boundaries |
| Calendar | **Partial** | Current readiness document lists missing week/filter/recovery/provider/source-change states |
| Design system | **Current validator passes** | 58 Studio families, 790 variants, 17 semantic mappings, 4 instruction entrypoints; visual/device certification remains separate |
| Accessibility/responsive | **Some focused evidence, not universal certification** | Existing audits cover selected routes; no claim of every current route, physical device, keyboard-only, or 200% zoom certification |

## Shared/Product/Ops lane

| Area | Status | Required P0 decision or artifact |
| --- | --- | --- |
| Strategic positioning | **Working draft** | Approve first wedge and public/strategic message hierarchy |
| Opportunity specification | **Missing as one adopted versioned contract** | Produce P1 contract with entities, IDs, evidence, lifecycle, and compatibility rules |
| Taxonomy | **Broad and actively changing** | Freeze pilot vocabulary and record unsupported/gap terms honestly |
| Source authority policy | **Strong direction, operationally uneven** | Apply source acceptance, first-party destination, identity, address, freshness, and publication checks per source |
| Metrics | **Partially instrumented** | Adopt P0 measurement contract and baseline save → prepare → confirmed submission → return |
| Commercial wedge | **Not decided in this audit** | Choose first organization segment, paid outcome, pilot price, and renewal test |
| Regional expansion | **Africa lead; other regions planned** | Choose 5–10 Africa pilot countries and the next regional pilot only after the core contract gate |
| Compliance/governance | **Requirements documented; legal/production matrix incomplete** | Review privacy, sensitive data, minors, payments, cross-border transfers, and recommendation explanations before regulated workflows |

## Current critical blockers

1. The checkout is heavily dirty; broad claims must not be based on uncommitted changes without identifying the exact file family and runtime.
2. Several readiness documents explicitly mark production, provider, migration, or device verification as partial or outstanding.
3. A broad route/API surface exists, but the canonical graph, public distribution contract, and full discovery-to-outcome lifecycle are not proven as one system.
4. Global expansion has source maps and ledgers, not continent-scale verified supply.

## P0 decisions to close

These are product decisions, not implementation assumptions. The following defaults are recorded as proposed working decisions so planning can proceed; the founder can override any of them.

1. First complete wedge: literary publications, grants, and residencies.
2. First paying organization: recurring small-to-mid-sized program operators.
3. Creator proof metrics: save → preparation; preparation → explicitly confirmed submission; return for another opportunity cycle.
4. Organization proof metric: complete a real call with measurable reduction in administrative work, then renew.
5. Africa pilot countries: Nigeria, Ghana, Kenya, Uganda, South Africa, Zambia, Zimbabwe, Namibia, and Cameroon remain the working set for a future Africa wave.
6. Regional sequencing: Africa is explicitly deferred today; no Africa source registry, crawler, or publication changes are part of this P0 run. Europe remains a later wave with its own evidence gate.

## External-authority boundary

No hosted deployment or database mutation is part of this P0 run. The execution boundary is a local production-like build/start/probe using the current checkout; Vercel, Railway, Neon, and provider evidence remain separately classified and require an isolated candidate when we choose to reconcile them.

## P0 acceptance gate

P0-local is complete when this ledger records the working wedge/ownership decisions, Africa deferral, and a successful local production-like build/start/probe with explicit evidence boundaries. Hosted database/worker reconciliation, deployment repair, and global source expansion remain follow-up work and must not be inferred from the local run.

## Next tickets

- `OL-P0-SH-01` — confirm or override the working wedge, organization segment, and success metrics.
- `OL-P0-LOCAL-01` — run and record local production-like build/start/critical-route probes without database mutation or deployment.
- `OL-P0-BE-01` — reconcile hosted database, migration journal, workers, queues, and publication readback.
- `OL-P0-BE-02` — diagnose production `/opportunities` 500 (Next digest `1119340933`) against the aliased deployment and authoritative database schema.
- `OL-P0-FE-01` — audit the canonical creator/public/organization journeys; the current design-system validator pass is recorded, but visual/device review remains.
- `OL-P1-SH-01` — draft Opportunity Layer Contract v1 from the verified P0 ledger.
