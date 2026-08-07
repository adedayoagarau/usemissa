# Story 14.1: Platform Admin control room and information architecture

Status: done

<!-- Story context prepared 2026-08-05. This file is the implementation handoff;
     the story creator did not change application code or sprint tracking. -->

## Story

As a Missa platform operator,
I want a responsive control room organized around attention, customers, content, analytics, and operations,
so that I can understand what needs action without navigating a collection of unrelated cards.

FR: 59

## Scope and delivery boundary

This story owns the Platform Admin shell, `/admin` Control Room, navigation
contract, and the integration of the existing read models into that first
surface. It is a read-first information-architecture story, not a new CRM,
CMS, product-event warehouse, support system, or agent execution system.

The current RadarEngine and WorkspaceEngine compatibility stores remain the
runtime truth. Every visible summary must identify its source, freshness, and
maturity. Optional durable worker/queue tables may add observed operational
detail, but their absence or partial deployment must remain explicit.

Stories 14.2–14.4 own the customer, content, and analytics read surfaces and
their contracts. Story 14.7 owns the eventual dedicated governance/agent
operations surface. Do not duplicate those stories' read models in 14.1.

## Acceptance Criteria

1. **Platform Admin shell and route contract**

   **Given** an active account with `account.isAdmin === true`
   **When** the operator opens `/admin`
   **Then** the page is identified as `Missa Platform Admin` and `Platform scope`
   **And** the shell exposes these plain-noun destinations in a stable order:
   `Control Room`, `Customers`, `Content`, `Analytics`, `Operations`, `Radar`,
   `Agents`, `System`, `Audit`, and `Policy`/`Taxonomy`
   **And** exactly one current destination has the active/`aria-current="page"`
   state for the current pathname and query.

   Canonical route ownership is:

   | Label | Target path | Owner/status in this story |
   | --- | --- | --- |
   | Control Room | `/admin` | This story; live read model |
   | Customers | `/admin/customers` | Story 14.2; navigation contract only here |
   | Content | `/admin/content` | Story 14.3; navigation contract only here |
   | Analytics | `/admin/analytics` | Story 14.4; navigation contract only here |
   | Operations | `/admin/operations` | Existing connected surface; preserve |
   | Radar | `/admin/radar` | Existing connected surface; preserve |
   | Agents | `/admin/agents` target; `/admin/operations?queue=agents` interim safe surface | Story 14.7 owns the dedicated route; do not fabricate a second agent data path |
   | System | `/admin/system` | Existing connected surface; preserve |
   | Audit | `/admin/audit` | Existing connected surface; preserve |
   | Policy → Taxonomy | `/admin/taxonomy` | Existing governed taxonomy surface; preserve its existing mutation boundary |

   `Workspace` and `Outbox` may remain queue filters inside Operations, but are
   not additional top-level Platform Admin domains in this story. Do not use
   `Enterprise Admin Console`, `Entity`, or inner `Workspace` as rendered
   Platform Admin navigation labels.

2. **Connected Control Room**

   **Given** the current Radar and Workspace read models can be read
   **When** `/admin` renders
   **Then** the above-the-fold summary includes a small, meaningful set of
   current metrics covering:
   - queue items that need attention;
   - organizations/accounts or observed customer activity;
   - Workspace open calls/content;
   - submissions/product flow; and
   - a visible Radar freshness or worker-signal caveat.

   **And** the values are derived from `PlatformAdminOverview` and its existing
   `AdminArea` contracts, not from mock arrays, browser-only counters, or a
   second backend fetch path.

3. **Provenance and maturity are visible**

   **Given** a metric or attention item is shown
   **Then** its containing section visibly communicates the applicable
   `AdminProvenance.maturity`, source, and freshness through the existing
   `MaturityBadge`/`ProvenanceNote` pattern or an equivalent shared primitive
   **And** unavailable, partial, demo/in-memory, latest-run-only, target-schema,
   and derived states are named honestly
   **And** a missing store is not rendered as a healthy zero
   **And** the Control Room explains that worker liveness is not productive
   throughput and that successful fetch is not processed content.

4. **Attention links are actionable and truthful**

   **Given** `PlatformAdminQueueData.rows` contains high- or medium-severity
   items
   **When** the Control Room shows its attention slice
   **Then** it shows a small deterministic subset of the existing queue, keeps
   the full count from `queue.summary.open`, and links each row through its
   existing safe `PlatformAdminQueueRow.action` or to `/admin/operations`
   **And** the attention surface does not invent a new queue, mutate records, or
   present a capped row count as the total.

   **Given** no high- or medium-severity item is observed
   **Then** the empty state says that no rows are currently flagged and also
   states that this does not prove worker or system health.

5. **Existing admin surfaces do not regress**

   **When** the new shell is used
   **Then** `/admin/operations` retains its current search, queue/severity
   filtering, selected-row evidence/detail behavior, mobile row presentation,
   refresh behavior, and narrow audited operation controls
   **And** `/admin/radar`, `/admin/system`, `/admin/audit`, and
   `/admin/taxonomy` retain their paths, authorization, provenance warnings,
   and existing read/mutation contracts
   **And** `GET /api/admin/overview` and the existing view APIs remain protected
   read paths; no client-side duplicate authorization or data loader is added.

6. **Responsive information architecture**

   **Given** a desktop viewport at or above the existing Workspace desktop
   breakpoint
   **Then** the Platform Admin shell provides persistent navigation and a
   bounded, dense content region
   **And**, at a 390px-wide mobile viewport, navigation collapses into the
   existing shadcn `Sheet`/menu pattern with an accessible trigger
   **And** the page has no document-level horizontal overflow
   **And** any genuinely dense table scrolls within its own region or converts
   to labelled rows/cards; it is not shrunk until unreadable.

7. **Accessibility and interaction**

   **Then** navigation, buttons, filters, links, tables, empty states, and the
   mobile Sheet have semantic names/landmarks, visible focus states, keyboard
   access, and `aria-current`/`aria-expanded` where applicable
   **And** meaning is not conveyed by color alone
   **And** the refresh control has a visible non-keyboard equivalent even where
   `Cmd/Ctrl+K` is supported
   **And** the implementation meets the repository's WCAG 2.1 AA baseline and
   honors reduced-motion behavior.

8. **Fail-closed access and privacy**

   **Given** a missing, malformed, expired, inactive, nonexistent, or
   unverifiable session
   **When** a page or admin API is requested
   **Then** the existing behavior remains: page access redirects to `/login`,
   unauthenticated API access is `401`, and no admin data is returned
   **And**, for an active non-admin account, page access redirects to `/home`
   and API access is `403`.

   **And** admin responses do not expose password hashes, session cookies/tokens,
   `DATABASE_URL`, session/cron/provider secrets, raw provider credentials,
   private message/file/submission payloads, or audit detail payloads
   **And** read APIs retain `cache-control: private, no-store`.

9. **No false persistence or scope expansion**

   **Then** this story adds no database tables, migrations, CRM/CMS/event
   persistence, broad admin mutation API, direct agent-to-agent execution, or
   publication bypass
   **And** planned capabilities are labelled planned/target-schema/unavailable
   rather than represented by fake CRUD controls or fabricated metrics
   **And** organization-facing navigation and centralized organization access
   remain unchanged.

## Tasks / Subtasks

- [ ] Reconcile the Platform Admin route registry and shell (AC: 1, 5, 6, 7)
  - [ ] Use one navigation implementation in `platform-admin-nav.tsx`; remove or stop using the duplicate `AdminShellNav` export in `platform-admin.tsx`.
  - [ ] Keep the canonical labels and hrefs above, including the staged Agents link, and do not promote Workspace/Outbox queue filters to top-level domains.
  - [ ] Make active-state calculation account for both pathname and relevant query filters so only the current destination is marked active.
  - [ ] Preserve the admin-only entry points in `apps/web/components/app-nav.tsx` and the separate organization navigation vocabulary.

- [ ] Make `/admin` a connected Control Room (AC: 2, 3, 4, 9)
  - [ ] Keep the page as a server component under the existing `(admin)` route group and pass the server-built `PlatformAdminOverview` into the Control Room component.
  - [ ] Reuse `MetricCard`, `SectionHeading`, `MaturityBadge`, `ProvenanceNote`, `WarningList`, and `PlatformAdminQueueRow`; do not create a parallel metric or queue contract.
  - [ ] Keep the above-fold summary small and link cards/attention rows to existing safe surfaces.
  - [ ] Ensure the `severity=high` Control Room deep link either initializes the Operations severity filter or is changed to a link that the current Operations contract actually honors; do not ship a decorative filter URL.
  - [ ] Keep full queue counts separate from per-lane row caps and show a truthful no-attention caveat.

- [ ] Preserve server/auth/data boundaries (AC: 3, 5, 8, 9)
  - [ ] Keep `requirePlatformAdminPage()` in the `(admin)` layout and `platformAdminJson()`/`requirePlatformAdmin()` on API routes.
  - [ ] Read through `getPlatformAdminOverview()` and the existing `getEngine()`/`getWorkspaceEngine()` bridges; do not add an internal HTTP hop or direct page-side database query.
  - [ ] Do not change the existing optional durable-table probe semantics or the narrow audited Operations mutations.

- [ ] Reconcile tests and verification (AC: 5–8)
  - [ ] Update the dirty `platform-admin.spec.ts` expectations to match the Control Room as the `/admin` heading while retaining Operations queue coverage.
  - [ ] Add/adjust route tests for `401`, active non-admin `403`, `private, no-store`, and no data leakage.
  - [ ] Add focused read-model tests for missing stores, partial durable tables, source/fetch/process distinctions, queue caps, stable attention ordering, and safe links.
  - [ ] Run desktop and 390px Playwright coverage; include an accessibility scan using the already-installed `@axe-core/playwright` if the current E2E harness supports it without introducing a second test framework.

## Dev Notes

### Current implementation map (read before editing)

The following is the current dirty-tree implementation, not a claim that the
work is merged or production-complete:

- `apps/web/app/(admin)/layout.tsx` is the page authorization boundary. It sets
  `dynamic = 'force-dynamic'`, calls `requirePlatformAdminPage()`, and renders
  `AdminShellNav` with the authenticated admin email.
- `apps/web/app/(admin)/admin/page.tsx` currently renders the untracked
  `PlatformAdminControlRoom` component with `getPlatformAdminOverview()`.
- `apps/web/components/platform-admin-control-room.tsx` currently renders
  Control Room summary cards, a capped attention slice, four domain links, a
  worker caveat, and Radar freshness. It currently consumes
  `overview.operations.data`, `overview.workspace.data`, and
  `overview.radar.data.sourceHealth`.
- `apps/web/components/platform-admin-nav.tsx` is the current responsive
  sidebar/mobile Sheet implementation. It currently contains the desired
  primary links plus provisional `Workspace`, `Agents`, and `Outbox` query
  links. Its active check currently uses pathname only, so query-based links
  need deliberate reconciliation.
- `apps/web/app/(admin)/admin/operations/page.tsx` currently renders the
  client `PlatformAdminOperationsQueue`. The queue supports search, queue and
  severity filters, row selection/detail, desktop table/mobile rows, `Cmd/Ctrl+K`
  focus, refresh, and the existing bounded operation buttons.
- `apps/web/lib/platformAdmin.ts` owns the public admin read-model contracts:
  `AdminMaturity`, `AdminProvenance`, `AdminArea<T>`,
  `PlatformAdminOverview`, `PlatformAdminOperationsData`,
  `PlatformAdminQueueData`, and `PlatformAdminQueueRow`. It builds metrics from
  the Radar/Workspace compatibility stores and optional durable summaries.
- `apps/web/lib/platformAdminApi.ts` is the shared API wrapper. It authorizes
  first, then returns an overview/view response with `private, no-store`.
- `packages/radar-adapters/src/platformAdmin.ts` probes optional tables
  (`radar_agent_runs`, `radar_agent_handoffs`, `radar_review_jobs`,
  `radar_review_decisions`, `radar_enrichment_jobs`, `outbox_events`, and
  `audit_events`) read-only, redacts connection/secret-like error text, and
  reports missing or incompatible tables as unavailable/partial.
- `packages/radar-adapters/src/platformAdminOperations.ts` owns the narrow
  retry/release-stale mutations and append-only platform audit writes. This
  story must not broaden that mutation surface.

### Exact contracts and data rules

Use these existing shapes instead of inventing a second API:

- `AdminArea<T> = { provenance: { maturity, source, freshness }, data: T,
  warnings: string[] }`.
- `PlatformAdminOverview` currently contains `generatedAt`, top-level
  `warnings`, and `radar`, `workspace`, `operations`, `system`, and `audit`
  areas. The Control Room can use the overview directly; it does not need a
  browser fetch to `/api/admin/overview`.
- `PlatformAdminQueueRow` carries `id`, `queue`, `title`, `reason`, `lane`,
  `age`, `status`, `severity`, `maturity`, `source`, an optional safe `action`,
  and an evidence/related-ID `detail`. Render those reasons and provenance;
  do not replace them with a bare colored count.
- `PlatformAdminOperationsData.queue.summary.open` is the full generated row
  count. `queue.rows` is capped at 100 per queue. The Control Room's attention
  count and footer must not imply that the loaded rows are the full dataset.
- Current Radar source health deliberately separates `attempted`,
  `successfulFetch`, `processed`, `stale`, fetch failures, and processing
  failures. Preserve those distinctions in any Control Room copy.
- Current worker status is `running`, `stale`, `failed`, or `unknown` based on
  explicit durable heartbeat metadata. A completed run or static agent graph
  is not a current worker heartbeat; absent heartbeat data must remain unknown.
- Current runtime persistence is compatibility-store based. With no
  `DATABASE_URL`, the web runtime is demo/in-memory and should say so. With a
  database, a Postgres-backed compatibility snapshot is live runtime data but
  does not prove that every additive target table is deployed.

### Information-architecture decisions

- Platform Admin and Organization Admin are separate planes. Platform Admin
  is tenant-independent operator visibility; Organization Admin remains scoped
  to a customer's organization through `organizationAccess.ts`.
- Platform Admin navigation uses boring industry nouns. Personality belongs in
  supportive copy/empty states, not route labels.
- Use `Policy → Taxonomy` as the current governed taxonomy entry if the nested
  label is retained; the existing `/admin/taxonomy` page and API are not to be
  moved or made tenant-accessible by this story.
- Agents is a named operator concern, but the current safe implementation is
  the Operations queue filter. Keep the target `/admin/agents` reserved for
  Story 14.7 rather than creating a second read model now.
- Customers, Content, and Analytics links are reserved for Stories 14.2–14.4.
  Their presence in the shell does not authorize 14.1 to fabricate their rows,
  filters, CRM/CMS persistence, or warehouse metrics.

### Security, privacy, and provenance guardrails

- `apps/web/lib/platformAdminAuth.ts` is the pure authorization decision:
  missing/inactive sessions return `401`, active non-admin sessions return
  `403`, and only an active admin session succeeds.
- `apps/web/lib/auth.ts` already fails closed for missing signing configuration,
  malformed/invalid tokens, missing accounts, and inactive accounts. Do not
  catch or reinterpret those failures as an admin session.
- Page access is protected by the `(admin)` layout; API access is protected in
  the Route Handler before the read model is assembled. Never rely on hiding a
  nav link as authorization.
- Never render or serialize `Account.passwordHash`, session tokens/cookies,
  provider credentials, connection strings, raw message/file/submission
  payloads, private answers, or audit detail payloads. The adapter's safe error
  redaction is part of this boundary.
- Keep `cache-control: private, no-store` on admin API responses. Do not add
  public caching or static generation to a tenant-independent operational view.
- Read-model warnings are evidence, not decoration. Missing optional schema,
  absent worker telemetry, empty compatibility data, and demo persistence must
  be distinct from a healthy production state.
- Agent coordination remains worker/database coordinated and bounded. The
  Control Room observes runs/handoffs; it never calls autonomous agents
  directly or bypasses review/publication gates.

### UX and visual constraints

Follow `DESIGN.md` as the visual source of truth:

- Start on a true white `#ffffff` canvas. Do not introduce cream, parchment,
  dark-console, gradient, or competitor-colour treatment.
- Reuse the existing semantic shadcn/Tailwind tokens and installed
  `Instrument Sans`, `Fraunces`, and `Fragment Mono` fonts. Instrument Sans is
  for UI/body/table text; Fragment Mono is for IDs, timestamps, counts, and
  compact metadata; Fraunces is reserved for rare display emphasis.
- Prefer hairline borders, spacing, and white surfaces to card-soup. Use cards
  only for summaries and grouped controls; use tables/structured lists for
  queue data.
- Keep attention/KPI blocks few and meaningful above the fold. Red/amber/green
  communicate explicit status and must always have text or an icon; do not call
  an unobserved state `healthy`.
- Active navigation uses a restrained terracotta indicator/text, not a large
  coloured capsule. Primary actions are scarce; the read-only Control Room's
  refresh is a secondary action.
- Use the existing shadcn `Sheet` for mobile navigation and preserve focus
  management. Use semantic table headers/captions and the current mobile
  labelled-row pattern from `platform-admin-queue.tsx`.
- Desktop admin may be dense/Linear-informed, but the mobile layout remains
  functional. Keep page gutters and container widths aligned with the existing
  `AdminPageFrame` and `DESIGN.md` rather than adding local breakpoints.

### Architecture and library requirements

- Keep the Next.js App Router route-group structure under `apps/web/app/(admin)`.
  Server components are the default; only pathname, Sheet, filter, or other
  interaction state belongs in a client component.
- Route Handlers call in-process library functions. Do not add an internal HTTP
  hop, Express/Fastify service, or direct client database access.
- Use the versions already locked by this checkout (`next`/`eslint-config-next`
  16.2.12, React 19.2.7, Tailwind 4.3.2, shadcn 4.13.0, lucide-react 1.23.0,
  Playwright 1.62.0, and `@axe-core/playwright` 4.12.1). Do not upgrade or
  add a dependency for this story; the lockfile and `apps/web/package.json`
  are authoritative over the older architecture note.
- Reuse existing shadcn primitives in `apps/web/components/ui`, especially
  `sheet` and `button`, plus `next/link` and `lucide-react`. Do not create a
  parallel design-system package or raw colour palette.
- Existing test conventions are Node's built-in `node:test` for library/route
  unit tests and Playwright for browser behavior. Do not introduce RTL/Vitest
  solely for this shell.

### File change map for the eventual dev implementation

Expected UPDATE/NEW files for this story:

- `apps/web/app/(admin)/layout.tsx` — preserve the auth boundary and dynamic
  rendering; integrate the single navigation implementation.
- `apps/web/app/(admin)/admin/page.tsx` — render the server-built Control Room.
- `apps/web/components/platform-admin-control-room.tsx` — Control Room layout,
  attention links, metric groups, caveats, and reserved domain links.
- `apps/web/components/platform-admin-nav.tsx` — canonical desktop sidebar,
  mobile Sheet, route registry, active state, and sign-out affordance.
- `apps/web/components/platform-admin.tsx` — shared primitives and provenance;
  remove the unused duplicate shell-navigation contract if safe.
- `apps/web/components/platform-admin-queue.tsx` — only the query/filter
  integration needed to honor Control Room deep links; preserve queue behavior.
- `apps/web/lib/platformAdmin.ts` — only additive/necessary contract changes;
  preserve existing read-model semantics and no-secret output.
- `apps/web/e2e/platform-admin.spec.ts` — reconcile the current expected
  headings/routes and add shell/mobile/overflow coverage.
- `apps/web/lib/platformAdmin.test.ts`,
  `apps/web/lib/platformAdminAuth.test.ts`, and the existing admin Route Handler
  tests — extend focused invariants without changing test infrastructure.

Expected NO-TOUCH scope for 14.1 unless a test-only import requires it:

- `packages/db` schema/migrations;
- `packages/radar-engine` and `packages/workspace-engine` domain models;
- `packages/radar-adapters` durable schema/worker implementations;
- organization-access rules and organization-facing route contracts;
- Passport/opportunity/taxonomy work currently in the dirty tree.

### Current implementation gaps to resolve explicitly

These are observed facts in the current worktree, not speculative future work:

1. `/admin` now renders `Control Room`, but the dirty
   `apps/web/e2e/platform-admin.spec.ts` still expects `Operations queue` at
   `/admin`. Update the test to the Epic 14.1 target while keeping the separate
   Operations assertions.
2. `PlatformAdminControlRoom` links the high-severity card to
   `/admin/operations?severity=high`, while the current queue component only
   initializes `queue`. Either add the minimal `initialSeverity` contract or
   change the link; test that the deep link actually filters.
3. `platform-admin-nav.tsx` uses pathname-only active matching for query-based
   Workspace/Agents/Outbox links. Prevent multiple false active states and keep
   only the intended IA destinations top-level.
4. `platform-admin.tsx` still exports an older `AdminShellNav` shape while the
   layout imports the new `platform-admin-nav.tsx` implementation. Avoid two
   navigation authorities.
5. The Customers/Content/Analytics paths are linked by the dirty shell but
   their route files are owned by sibling stories. Do not hide that dependency
   with fake pages or fake data; integrate against their actual routes when
   available and keep this story's tests focused on the shell contract.

## Test plan

### Unit/read-model tests

- Build a deterministic overview with demo/in-memory Radar and Workspace stores
  and assert Control Room source labels, counts, maturity, warning behavior, and
  the separation of worker status from throughput.
- Assert unavailable Radar/Workspace stores produce `unavailable` warnings,
  not a healthy zero state.
- Assert partial optional durable tables remain `partial`/`unavailable` and do
  not hide compatibility-store metrics.
- Assert attention filtering is deterministic, high/medium only, bounded to
  the intended display slice, and does not replace `summary.open` with the
  displayed-row count.
- Assert queue actions/links stay on the existing safe paths and no private
  payload, password hash, token, connection string, or audit detail is present
  in the serialized overview.
- Keep the existing `authorizePlatformAdmin` cases for unauthenticated,
  inactive, non-admin, and active-admin sessions.

### Route/auth tests

- `GET /api/admin/overview`: no cookie or invalid session → `401` with no
  admin payload; active non-admin → `403`; active admin → read model with
  `cache-control: private, no-store`.
- Existing `/api/admin/radar`, `/operations`, `/system`, `/audit`, and
  `/taxonomy` authorization remains covered; operation mutations still reject
  before reading queues when unauthenticated.
- Page-level checks verify unauthenticated redirects to `/login` and active
  non-admin redirects to `/home` without leaking whether protected data exists.

### Browser/accessibility tests

- In the demo Playwright server, log in with the seeded admin fixture and assert
  `/admin` has the `Control Room` heading, Platform Admin navigation, the four
  high-level metric links, an attention state (populated or truthful empty),
  and the correct provenance/caveat copy.
- Assert every canonical nav label/href and one active `aria-current` state;
  assert Agents uses the staged safe Operations queue href until its dedicated
  story lands.
- Navigate to `/admin/operations` and retain search, queue/severity filtering,
  detail selection, refresh, and bounded-operation assertions.
- At 390×844, open the Platform Admin Sheet, verify its accessible name and
  keyboard/focus behavior, then assert
  `document.documentElement.scrollWidth <= window.innerWidth + 1`.
- Run the existing axe-core Playwright scan or equivalent focused checks for
  landmarks, names, table headers, focus visibility, and color-independent
  status text.

### Verification commands

```sh
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm test --workspace=@missa/radar-adapters
npm run test:e2e --workspace=@missa/web -- e2e/platform-admin.spec.ts
```

Run the commands from the current worktree after reconciling the dirty E2E
expectations. Report failures caused by unrelated dirty files separately; do
not clean or revert them to make this story pass.

## Previous story / sibling intelligence

14.1 is the first story in Epic 14, so there is no previous Epic 14 story file
to inherit. The sibling handoffs already present in the worktree establish the
following boundaries:

- 14.2 is a read-only `/admin/customers` projection over organizations,
  accounts, memberships, billing fields, and observed Workspace activity; it
  must omit credentials/private content and label CRM-only fields planned.
- 14.3 is a read-only `/admin/content` registry that keeps Radar opportunities
  distinct from Workspace open calls and does not simulate a CMS.
- 14.4 is a derived `/admin/analytics` surface whose metrics require grain,
  calculation, source, freshness, maturity, and privacy boundaries; it must
  not claim retention/cohort/attribution/warehouse facts that are not stored.

The Control Room should link to these contracts, not absorb them.

## Git intelligence and current dirty-tree boundaries

Snapshot taken 2026-08-05 before this story file was created:

- Branch: `fix/passport-mobile-layout`, tracking `origin/fix/passport-mobile-layout`.
- `HEAD`: `ccc6c70` (`feat(admin): add operational controls and worker health`).
- `origin/main`/tracking base observed at `4504b50`; the branch was ahead by 2
  commits. Relevant local commits are `9f91400` (`feat(admin): add platform
  control room`) and `ccc6c70` (`feat(admin): add operational controls and
  worker health`). Local commit history is not proof that the dirty follow-on
  implementation is merged or deployed.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` already lists
  Epic 14 as `in-progress` and 14.1–14.4 as `ready-for-dev`, but the 14.1 story
  file was absent at snapshot time. Per the user instruction, do not update
  sprint-status.yaml in this story-creation task.
- `_bmad` and `_bmad/bmm/config.yaml` are absent in this checkout, as is any
  `project-context.md`; the BMAD customization fallback was applied manually.

Do not reset, clean, stash, overwrite, or reinterpret these existing changes:

### Story/planning files already dirty or untracked

- Modified: `_bmad-output/planning-artifacts/epics.md` and
  `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Untracked: `_bmad-output/planning-artifacts/admin-control-plane-scope.md`.
- Untracked sibling handoffs:
  `14-2-platform-customer-directory-and-crm-lite-read-model.md`,
  `14-3-content-cms-registry-for-radar-and-workspace.md`, and
  `14-4-platform-product-analytics-and-metric-definitions.md`.

### Platform Admin files overlapping this story

- Modified: `apps/web/app/(admin)/layout.tsx`,
  `apps/web/app/(admin)/admin/page.tsx`,
  `apps/web/app/(admin)/admin/operations/page.tsx`,
  `apps/web/components/platform-admin.tsx`,
  `apps/web/e2e/platform-admin.spec.ts`,
  `apps/web/lib/platformAdmin.ts`, and
  `apps/web/lib/platformAdmin.test.ts`.
- Untracked: `apps/web/components/platform-admin-control-room.tsx`,
  `apps/web/components/platform-admin-nav.tsx`, and
  `apps/web/components/platform-admin-queue.tsx`.
- Existing committed/current admin files that must remain compatible include
  `apps/web/app/(admin)/admin/{radar,audit,system}/page.tsx`,
  `apps/web/app/api/admin/{overview,radar,operations,system,audit,taxonomy}/`,
  `apps/web/lib/platformAdminAuth.ts`,
  `apps/web/lib/platformAdminApi.ts`,
  `apps/web/components/platform-admin-actions.tsx`, and
  `apps/web/app/(workspace)/admin/taxonomy/page.tsx`.

### Unrelated dirty work to preserve

- `Dockerfile`, `docker/research-agent/Dockerfile`, `docs/railway-topology.md`,
  `packages/radar-adapters/README.md`,
  `packages/radar-adapters/package.json`,
  `packages/radar-adapters/src/{agentGraph,coverageWorker,index,opportunityRepository,workerTelemetry}.ts`,
  and `packages/radar-adapters/test/opportunityRepository.test.ts`.
- `apps/web/app/api/cron/tick/route.ts`,
  `apps/web/app/(passport)/opportunities/{opportunities.module.css,page.tsx}`,
  `apps/web/components/{opportunity-card,opportunity-filters,opportunity-results-refresh,opportunity-search}.tsx`,
  `apps/web/lib/{opportunityQuery,opportunityRepository,opportunityTaxonomy}.ts`,
  and `design-qa.md`.
- Untracked taxonomy/discovery work:
  `docs/missa-taxonomy-discovery.md`,
  `packages/radar-adapters/src/taxonomyDiscoveryWorker.ts`, and
  `packages/radar-adapters/test/taxonomyDiscoveryWorker.test.ts`.

The only file this story-creator task is authorized to create/update is this
story file.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md`, Epic 14 and Story 14.1]
- [Source: `_bmad-output/planning-artifacts/admin-control-plane-scope.md`, Decision; What is buildable from the current backend; What is not present yet; Metric contract; Delivery sequence; Design constraints]
- [Source: `DESIGN.md`, Product Character; Foundation decision; Three Interface Registers; Color; Typography; Tables and structured lists; Navigation; Responsive Behaviour; Accessibility; Implementation Contract]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`, Key Design Challenges; Experience Principles; UX Pattern Analysis & Inspiration; Design System Foundation; Success Criteria; Component Strategy; Navigation Patterns; Responsive Design & Accessibility]
- [Source: `docs/missa-naming-decisions.md`, The Rule; Organization Side; Enterprise Layer; Names Retired Entirely]
- [Source: `docs/missa-naming-inventory.md`, Enterprise Layer and Where to Look]
- [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`, Authentication & Security; API & Communication Patterns]
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`, Naming Patterns; Structure Patterns]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`, `apps/web` route groups and API/component boundaries]
- [Source: `_bmad-output/planning-artifacts/architecture/starter-template-technical-preferences.md`, locked stack preferences]
- [Source: `ONBOARDING.md`, Data and persistence; Authentication and authorization; Admin routes; Gotchas]
- [Source: `_bmad-output/implementation-artifacts/quick-platform-admin.md`, Intent; Boundaries & Constraints; Code Map; implementation guardrails]
- [Source: `apps/web/app/(admin)/layout.tsx` and `apps/web/app/(admin)/admin/page.tsx`, current page boundary and Control Room entry]
- [Source: `apps/web/components/platform-admin-control-room.tsx`, current Control Room projection and known deep links]
- [Source: `apps/web/components/platform-admin-nav.tsx` and `apps/web/components/platform-admin-queue.tsx`, current responsive shell, filters, and queue interactions]
- [Source: `apps/web/lib/platformAdmin.ts`, current admin contracts/read-model assembly]
- [Source: `apps/web/lib/platformAdminAuth.ts`, pure 401/403 decision]
- [Source: `apps/web/lib/platformAdminApi.ts` and `apps/web/app/api/admin/`, protected API response contract]
- [Source: `apps/web/lib/auth.ts`, signed-session resolution and fail-closed behavior]
- [Source: `packages/radar-adapters/src/platformAdmin.ts`, optional durable probe contract and redaction]
- [Source: `packages/radar-adapters/src/platformAdminOperations.ts`, narrow audited queue mutations]
- [Source: `apps/web/package.json`, local dependency versions and test scripts]

## Dev Agent Record

### Agent Model Used

BMAD story-creator / PM context engine

### Debug Log References

- BMAD resolver script was unavailable because `_bmad/scripts/resolve_customization.py`
  is absent; base customizations were read directly. No project application
  files were modified during analysis.

### Completion Notes List

- Ultimate context-engine analysis completed for Epic 14 Story 14.1.
- Current implementation, exact contracts, security/provenance rules, UX
  constraints, sibling boundaries, test plan, and dirty-tree snapshot recorded.
- Story context was prepared before implementation; the completion record below
  reflects the shipped implementation.

## Implementation and validation

- Added the responsive Platform Admin shell with the approved Control Room,
  Customers, Content, Analytics, Operations, Radar, Agents, System, Audit, and
  Policy → Taxonomy destinations. Workspace and Outbox remain Operations
  filters rather than top-level domains.
- Replaced the queue-only `/admin` landing page with an attention-first Control
  Room backed by `getPlatformAdminOverview()`, retaining the full Operations
  workbench and its audited recovery controls.
- Added query-aware active navigation and a truthful `severity=high` deep link
  into Operations.
- `npm run typecheck --workspace=@missa/web` passed.
- Scoped admin ESLint passed; repository-wide lint still reports pre-existing
  errors in unrelated Opportunity search files.
- `npm run build --workspace=@missa/web` passed and classified all Platform
  Admin pages as dynamic.
- `npm run test:e2e --workspace=@missa/web -- e2e/platform-admin.spec.ts`
  passed on desktop and 390px mobile coverage.

### File List

- `_bmad-output/implementation-artifacts/14-1-platform-admin-control-room-and-information-architecture.md` (created)
