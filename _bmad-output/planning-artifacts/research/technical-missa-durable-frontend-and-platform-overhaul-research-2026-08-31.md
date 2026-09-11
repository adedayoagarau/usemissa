---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - '/Users/adedayoagarau/Downloads/DESIGN-miro.md'
  - 'miro/DESIGN.md'
  - 'DESIGN.md'
  - 'apps/web/app/globals.css'
  - 'docs/chillsubs-ui-capture-and-missa-interface-spec-2026-08-30.md'
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Missa durable frontend and platform overhaul'
research_goals: 'Decide whether to redesign the frontend, establish a new design-system approach, evaluate Svelte migration versus the current Next.js stack, assess SWR, Vercel Flags, Turborepo, Workflow, and DeepSec, and define a durable phased architecture plan.'
user_name: 'Adedayo'
date: '2026-08-31'
web_research_enabled: true
source_verification: true
---

# Rebuilding Missa for Durability: Comprehensive Frontend and Platform Overhaul Research

**Date:** 2026-08-31
**Author:** Adedayo
**Research Type:** technical

---

## Research Overview

This research determines how Missa should overhaul its full product interface and supporting platform without sacrificing durable state, evidence boundaries, accessibility, or operational safety. It evaluates the current repository and product architecture alongside Next.js/React, SvelteKit, SWR, Turborepo, Vercel Flags, Workflow, DeepSec, Neon/Postgres, Redis, Railway workers, the supplied Miro design analysis, and the atomic opportunity-disclosure patterns captured from Chill Subs.

The central finding is that Missa needs a comprehensive redesign and architecture-consolidation program, but not a framework rewrite. The recommended path retains Next.js 16, React 19, TypeScript, the existing Base UI/shadcn foundation, Neon/Postgres authority, and Railway worker lanes. It replaces the interface through complete, flagged product journeys supported by a governed five-layer design system, explicit domain contracts, truthful disclosure models, measurable accessibility/performance gates, and reversible rollout.

The final decision, roadmap, risk register, success measures, and immediate next actions appear in **Research Synthesis and Executive Decision** near the end of this report. All external technical claims use current primary documentation; repository evidence, live-operational uncertainty, user instructions, and supplied design references remain explicitly separated.

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
3. [Integration Patterns Analysis](#integration-patterns-analysis)
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
6. [Technical Research Recommendations](#technical-research-recommendations)
7. [Research Synthesis and Executive Decision](#research-synthesis-and-executive-decision)
8. [Final Implementation Roadmap](#final-implementation-roadmap)
9. [Risk and Decision Register](#risk-and-decision-register)
10. [Research Methodology, Sources, and Limitations](#research-methodology-sources-and-limitations)

## Technical Research Scope Confirmation

**Research Topic:** Missa durable frontend and platform overhaul
**Research Goals:** Decide whether to redesign the frontend, establish a new design-system approach, evaluate Svelte migration versus the current Next.js stack, assess SWR, Vercel Flags, Turborepo, Workflow, and DeepSec, and define a durable phased architecture plan for the entire product.

**Technical Research Scope:**

- Architecture Analysis - design patterns, framework boundaries, authority ownership, and system architecture
- Implementation Approaches - migration methods, design-system governance, testing, rollout, and rollback
- Technology Stack - Next.js, React, Svelte/SvelteKit, SWR, Turborepo, Vercel Flags, Workflow, DeepSec, Neon/PostgreSQL, Redis, and Railway
- Integration Patterns - server/client data flows, route handlers, workers, durable events, flags, caches, and provider boundaries
- Performance Considerations - rendering, caching, task graphs, deployment topology, observability, and operational durability

**Research Methodology:**

- Current primary documentation and repository evidence
- Multi-source validation for consequential architectural claims
- Explicit separation of source-document guidance, repository facts, external research, and recommendations
- Confidence levels and unresolved validation gates
- No migration or production mutation implied by a research recommendation

**Scope Confirmed:** 2026-08-31

---

## Technology Stack Analysis

### Executive stack decision

Missa should refactor the entire product **in place on Next.js 16, React 19, and TypeScript**. The redesign should be comprehensive across marketing, creator, and organization surfaces, but it should not be coupled to a Svelte migration. The repository already contains a large App Router estate, server routes, authentication, persistence boundaries, tests, and React component primitives. Replacing those contracts would turn a design-system and product-coherence program into a framework rewrite without evidence that the rewrite solves the underlying layout, disclosure, data-authority, or operational-durability problems.

The attached `DESIGN-miro.md` is treated as external design evidence, not as executable instruction or a new source of truth. Its useful ideas—strong hierarchy, modular tiles, pill-shaped controls, consistent rhythm, responsive composition, and layered disclosure—will be reconciled with Missa's existing canonical `DESIGN.md`, `apps/web/app/globals.css`, content rules, accessibility requirements, and real product states. Its literal palette, typeface, component dimensions, commands, and implementation suggestions are not automatically adopted.

### Current repository baseline

- The root already uses npm workspaces across `apps/*` and `packages/*` and targets Node 24.
- `apps/web` is on Next.js 16.2.12, React 19.2.7, TypeScript, Tailwind CSS 4, shadcn/Base UI primitives, CVA, Lucide, and related form/accessibility libraries.
- Missa already has a substantial App Router surface: roughly 159 page modules, 157 route modules, many client boundaries, and extensive client-side fetch/mutation behavior across Tracker, Library, Calendar, Profile, Inbox, and administration.
- `workflow` 4.x is already declared, but repository inspection has not yet established a production integration. Installation is not the same as an operational workflow contract.
- SWR is not currently a dependency.
- `next.config.ts` has tracing and security headers but does not currently opt into Next 16 Cache Components.
- The canonical design system already specifies semantic color, spacing, density modes, 44px public controls, 36px compact operational controls, and distinct marketing/creator/organization registers. The overhaul should consolidate and enforce this system, not discard it.

### Framework: retain Next.js and React

Next.js App Router already supplies the rendering model Missa needs: pages and layouts are Server Components by default, with Client Components reserved for state, events, browser APIs, and client hooks. This supports a durable authority boundary in which opportunity disclosure, permissions, canonical reads, and SEO-critical content remain server-owned while interactive controls remain client-owned. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

React Server Components are stable at the component level, while their framework/bundler implementation APIs are not a do-it-yourself portability layer. Using them through Next.js is lower-risk than replacing established application plumbing. [React: Server Components](https://react.dev/reference/rsc/server-components)

Next 16 also offers explicit opt-in Cache Components and partial prerendering, allowing static, cached, and request-time content to coexist. This is worth piloting on a low-risk public route after data ownership and invalidation rules are documented; it should not be switched on globally as a performance guess. [Next.js: Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents) and [Next.js 16](https://nextjs.org/blog/next-16)

**Decision:** keep Next.js/React, reduce unnecessary client boundaries, and standardize server reads and mutation/revalidation contracts before optimizing caches.

### Svelte/SvelteKit assessment

SvelteKit is a capable full-stack framework with filesystem routing, SSR, client navigation, prerendering, adapters, load functions, endpoints, and progressive form actions. [SvelteKit introduction](https://svelte.dev/docs/kit/introduction), [routing](https://svelte.dev/docs/kit/routing), and [form actions](https://svelte.dev/docs/kit/form-actions)

However, its route, loading, mutation, component, authentication, testing, and deployment contracts differ materially from Missa's current stack. A move would require reimplementing and revalidating the product rather than merely restyling it. No repository evidence currently shows that React itself is the cause of the broken layout or inconsistent opportunity disclosure.

**Decision:** do not move the product to SvelteKit. Keep the new token schema, component anatomy, content contracts, and state models framework-neutral so a future isolated experiment remains possible. A Svelte spike should occur only if a bounded surface has measurable bundle or interaction goals that Next/React cannot meet.

### Data fetching: server authority plus selective SWR

SWR hooks run only in Client Components in the App Router. It is useful when the browser genuinely owns freshness—focus/reconnect revalidation, polling, optimistic mutation, rollback, and race avoidance—but it should not duplicate every Server Component read. [SWR with Next.js](https://swr.vercel.app/docs/with-nextjs), [automatic revalidation](https://swr.vercel.app/docs/revalidation), and [mutation](https://swr.vercel.app/docs/mutation)

Adopt SWR selectively for:

- inbox, queue, and notification counters that can change while a page remains open;
- long-running ingestion, export, or review progress;
- tracker/follow/save state shared across mounted client surfaces or browser tabs;
- optimistic actions where immediate feedback materially improves the workflow.

Keep initial opportunity disclosure, permissions, canonical profile/opportunity reads, search-engine content, and database access server-side. Writes remain authorized through Server Actions or route handlers. Each SWR resource must have a typed key, owner, mutation contract, invalidation event, stale policy, error state, and test. Avoid wrapping entire pages in an ungoverned client cache.

### Monorepo orchestration: introduce Turborepo incrementally

Turborepo is a task-graph and caching layer, not a product framework. It can make Missa's existing workspaces more durable by formalizing package-owned scripts, dependency order, declared outputs, environment inputs, affected-package CI, and reusable local/remote artifacts. [Configuring tasks](https://turborepo.com/docs/crafting-your-repository/configuring-tasks), [remote caching](https://turborepo.com/docs/core-concepts/remote-caching), and [`turbo run`](https://turborepo.com/docs/reference/run)

Adoption should begin with deterministic read-only tasks—typecheck, lint, unit tests, and builds—then add affected-package CI. Environment variables that affect outputs must be declared in the task hash; otherwise caching can preserve incorrect results. [Turborepo environment variables](https://turborepo.com/docs/crafting-your-repository/using-environment-variables)

**Decision:** adopt Turborepo as an incremental build-contract layer after inventorying current scripts. Do not assume it repairs package coupling or flaky tasks.

### Safer rollout: Vercel Flags / Flags SDK

Flags should decouple deployment from release during the overhaul. Use a small number of server-evaluated, expiring flags to replace vertical slices—for example, opportunity list plus filter state plus detail disclosure—while retaining a rollback path. The Flags SDK is provider-agnostic and supports Next.js; it does not require a framework migration. [Flags SDK Next.js quickstart](https://flags-sdk.dev/docs/frameworks/next) and [Vercel Flags](https://vercel.com/docs/flags)

Every flag needs an owner, purpose, target population, stable identity source, observability signal, rollback condition, expiry date, and removal task. Keep evaluation server-side where possible. Explorer/discovery secrets and any client-visible variants require deliberate disclosure and access controls. [Flags Explorer reference](https://vercel.com/docs/flags/flags-explorer/reference)

**Decision:** use flags as temporary migration safety rails, not permanent configuration or branching architecture. Confirm current service status, SLA, and pricing before making Vercel-hosted flag evaluation a critical dependency.

### Durable work: stabilize Workflow 4 before considering Workflow 5

Workflow is appropriate for long-running, resumable orchestration in which coordination lives in a workflow and side effects live in independently retried steps. Its persistence model can survive crashes and deployments, but retries make idempotency, compensation, authenticated callbacks, payload governance, and deterministic business keys mandatory. [Workflow documentation](https://useworkflow.dev) and [`defineHook`](https://useworkflow.dev/docs/api-reference/workflow/define-hook)

Missa already declares Workflow 4.x. Before adding new orchestration, inventory the existing dependency's actual usage and document current queue, retry, wait, callback, and worker ownership across Vercel, Railway, Redis, and Postgres. Workflow 5 was still described as beta in Vercel's June 2026 material, so a version jump should be a separate compatibility decision. [Workflow payload compression announcement](https://vercel.com/changelog/workflow-sdk-now-compresses-run-and-step-payloads)

**Decision:** stabilize and prove Workflow 4 semantics first; do not combine a workflow-version migration with the UI overhaul.

### Security: gated DeepSec onboarding

DeepSec is an AI-assisted security review harness, not a security certification. Normal initialization can create `.deepsec`, install dependencies, authenticate with providers, create a dedicated Vercel credential project, share repository source with a selected model, and incur model cost. [DeepSec getting started](https://deepsec.sh/docs/getting-started)

The completed read-only plan found a 10,446-file repository and requested two unresolved choices: approval to create/link the deterministic Vercel project `deepsec-usemissa-7d8f35b6`, and a model profile. No `.deepsec` directory or external project was created.

Adopt scaffold-first only after approving source-sharing, provider/model, cost ceiling, duration ceiling, ignored paths, and finding triage ownership. AI findings must be revalidated; DeepSec's own FAQ reports a meaningful false-positive range even for high-severity findings. [DeepSec FAQ](https://github.com/vercel-labs/deepsec/blob/main/docs/faq.md)

**Decision:** do not run full initialization yet. When authorized, begin with `--scaffold-only`, review the threat model and data boundaries, then run a cost- and duration-bounded baseline outside untrusted PR execution.

### Design-system technology approach

The new system should be a governed evolution of Missa's existing shadcn/Base UI foundation:

1. **Foundations:** primitive and semantic tokens, typography, density, motion, breakpoints, focus, contrast, and truthful content states.
2. **Primitives:** accessible controls with stable anatomy and variants, implemented once on Base UI/shadcn rather than per feature.
3. **Disclosure patterns:** tiles, list rows, filter groups, fact blocks, evidence/source rows, eligibility, deadline/fee/status unknowns, actions, and progressive detail.
4. **Surface systems:** expressive marketing, calm creator discovery/workflow, and compact organization operations, all using the same foundations.
5. **Governance:** Storybook or an equivalent component workshop, visual regression at agreed breakpoints, interaction/a11y contracts, deprecation rules, ownership, and codemods where practical.

The first implementation slice should be opportunities end-to-end—not an isolated card—because the prior Chill Subs inspection showed that layout quality depends on the full list/filter/detail/disclosure flow and the atomic treatment of unknown, verified, source-linked, saved, and actionable information.

### Technology adoption sequence

1. Freeze and reconcile the canonical token/content/state model; classify the Miro material as reference input.
2. Inventory routes, client boundaries, data owners, component duplicates, and task scripts.
3. Establish design-system foundations, primitives, accessibility tests, and visual-regression fixtures.
4. Add Turborepo around deterministic existing tasks.
5. Replace one complete opportunity vertical slice behind a temporary server-side flag.
6. Add SWR only to identified live client resources in that slice.
7. Expand by product journey: discovery → save/follow → tracker/calendar/inbox → profile → organization review/operations → marketing.
8. Stabilize durable background-work contracts independently of UI replacement.
9. Onboard DeepSec through an explicitly approved, bounded security track.

### Confidence and unresolved gates

- **High confidence:** retain Next.js/React; evolve the existing design system; use full vertical slices; keep authoritative disclosure server-owned.
- **High confidence:** Turborepo, flags, Workflow, SWR, and DeepSec solve different durability layers and should not be introduced as a single big-bang rewrite.
- **Medium confidence:** exact SWR targets and Workflow scope until route-level data-flow and dependency-use inventories are complete.
- **Unresolved:** current Vercel Flags service/SLA fit, remote-cache trust policy, DeepSec provider/cost approval, and whether current Workflow 4 is operationally used or merely installed.

### Sources consulted

Primary sources were used for framework and platform behavior: Next.js, React, Svelte/SvelteKit, SWR, Turborepo, Flags SDK/Vercel Flags, Workflow, and DeepSec documentation linked above. Repository facts come from the current Missa worktree. `DESIGN-miro.md` is a user-supplied design reference. These evidence classes are intentionally kept separate.

## Integration Patterns Analysis

### Integration principle: one authority, multiple projections

Missa should integrate around a single rule: **Postgres owns durable business truth; every other layer transports, orchestrates, caches, or presents it.** The browser is not the authority for opportunity publication, identity, approval, submission, delivery, or completion. Redis/BullMQ and Workflow may coordinate work, but neither should silently replace the durable event, receipt, idempotency, and publication records already represented in the database.

The target flow is:

```text
User or provider request
  -> Next.js boundary validates identity, authorization, schema, and intent
  -> one Postgres transaction updates state and records event/outbox intent
  -> asynchronous worker or Workflow executes retryable work
  -> provider receipt, webhook, or reconciliation updates Postgres
  -> server cache tags and mounted client caches are invalidated
  -> UI renders the new durable projection
```

This separates six concerns that are currently easy to conflate:

1. **Command:** what an authenticated actor requested.
2. **Durable state:** what Postgres has accepted and versioned.
3. **Execution:** what a worker or workflow is attempting.
4. **Evidence:** what a provider, source, or reviewer confirmed.
5. **Projection:** what caches and read models expose.
6. **Release exposure:** which interface a temporary flag allows a user to see.

### API design patterns

#### Server Components for authoritative reads

Server Components should read repositories or server-only data access modules directly. They are the preferred boundary for initial opportunity disclosure, public profiles, eligibility facts, permissions, and SEO-visible content. Calling Missa's own HTTP Route Handlers from a Server Component adds an unnecessary network boundary and can split authorization and cache behavior.

The existing opportunity API already demonstrates useful contracts: `apps/web/app/api/opportunities/route.ts` parses URL-backed browse queries, resolves an optional session, delegates to `getOpportunityRepository()`, validates output through `@missa/contracts`, and distinguishes public shared caching from private `no-store` responses. The detail handler also prevents anonymous access to non-public statuses.

#### Server Actions for UI-originated commands

The current repository contains no `use server` actions; UI mutations use Route Handlers. Server Actions may be introduced selectively for form and control mutations that are private to the Next.js interface, but this is an architectural option rather than the current baseline. Every exported action must be treated as a public POST endpoint: validate the session, object-level permission, expected revision, schema, and idempotency key inside the action. UI visibility is never authorization. Next.js documents that Server Functions are directly reachable and recommends authenticating within each action. [Next.js mutating data](https://nextjs.org/docs/app/getting-started/mutating-data) and [authentication](https://nextjs.org/docs/app/guides/authentication)

Use actions for cohesive product commands such as `saveOpportunity`, `changeTrackerStatus`, `approveApplicationRevision`, or `publishOpenCall`, not generic CRUD wrappers. On success, return the new durable version/receipt and invalidate the specific server projection.

#### Route Handlers for machine and public HTTP boundaries

Route Handlers remain appropriate for:

- public or partner APIs;
- provider webhooks and OAuth callbacks;
- cron triggers and health endpoints;
- downloads, media, calendar feeds, and streaming responses;
- endpoints consumed by non-Next clients.

They must verify signatures/secrets, validate schemas, apply replay protection, and return quickly after recording durable intent. Provider webhooks should be acknowledged after a transactional receipt/deduplication record, not after all downstream work completes. [Next.js backend-for-frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)

The current cron route authenticates `CRON_SECRET` and invokes bounded worker ticks. Its query-string secret fallback should be deprecated because URLs are more likely to enter logs and history; prefer the authorization header only.

#### REST, GraphQL, and RPC decision

- **REST/HTTP:** retain for public resources, webhooks, callbacks, feeds, media, and cross-runtime integrations.
- **Typed in-process repositories/contracts:** prefer within the Next.js application and shared packages.
- **GraphQL:** do not add. The current problem is contract governance and duplicated client orchestration, not insufficient query flexibility.
- **gRPC/RPC:** do not add to the browser path. Consider only if a future high-volume independently deployed internal service demonstrates a measured need for binary contracts or streaming.

### Communication protocols

#### Synchronous HTTPS

Use HTTPS request/response for reads, authenticated commands that can commit quickly, provider callbacks, and status lookup. A successful command response means the database accepted the intent or completed the transaction; it must not imply that asynchronous external work finished.

Recommended response vocabulary:

- `200/201`: durable result committed;
- `202`: durable intent accepted and asynchronous execution started, with operation/run ID;
- `409`: expected revision or idempotency identity conflict;
- `422`: valid transport but invalid domain transition;
- `429`: rate boundary reached;
- `503`: required durable dependency unavailable.

#### Queue and worker communication

Missa contains a BullMQ/Redis ingestion-v2 path whose queue configuration provides bounded attempts, exponential backoff, and retained completion/failure records. However, the current ingestion-v2 package documentation identifies Redis-free Postgres claiming as the preferred hosted worker and retains BullMQ as a rollback path; older topology documentation still describes the BullMQ deployment. This is a documentation/runtime transition that must be resolved before consolidation. The canonical Radar worker runs as a long-lived Railway/container lane, records durable telemetry in Postgres, and uses bounded ticks plus snapshot conflict controls; the Vercel cron is a fallback trigger.

Do not migrate or remove the BullMQ rollback path until the actual hosted ingestion-v2 lane is verified and an explicit consolidation plan exists. Do not introduce Redis Streams merely because they are event-oriented. Redis documents Streams as an append-only log with consumer groups, acknowledgements, pending-entry recovery, replay, and at-least-once delivery; those semantics require idempotent consumers and retention operations. [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/) and [Redis streaming](https://redis.io/docs/latest/develop/use-cases/streaming/)

If Missa later needs multiple independent consumers to replay the same ordered event stream, evaluate Streams or Vercel Queues against an explicit retention, portability, and operations requirement. Postgres must remain the long-lived audit ledger because queue retention and operational history are different concerns.

#### WebSockets and live UI

Do not make WebSockets a baseline dependency for the redesign. SWR focus/reconnect revalidation and bounded polling are sufficient for most counters, job progress, and cross-tab freshness. Add Server-Sent Events or WebSockets only for a measured collaborative or sub-second use case, and keep reconnect/resume cursors tied to durable server state.

### Data formats and standards

- **JSON with shared schemas:** default for HTTP APIs, events, Workflow inputs, and queue jobs. Validate at every trust boundary with the existing `@missa/contracts` pattern.
- **FormData:** acceptable for Server Actions and uploads, then immediately normalize into domain commands.
- **Database rows/events:** use versioned schemas, timestamps, correlation/causation IDs, actor identity, expected revision, and idempotency keys.
- **Webhooks:** retain raw body where signature verification requires it; store provider event ID, verification result, receipt time, and a redacted payload or payload reference.
- **iCalendar:** retain for the safe one-way calendar projection. Provider-native bidirectional calendar integration requires stable external IDs, OAuth lifecycle, webhook verification, incremental synchronization, and missed-webhook recovery.
- **CSV:** use only as an import/export boundary with preview, normalized validation results, source hash, confirmation, and an idempotent commit receipt. It is not an internal event format.
- **Protobuf/MessagePack/XML:** no present need. Adding binary or legacy formats would create tooling and observability cost without a demonstrated integration requirement.

### System interoperability approaches

#### Repository and contract boundary

Continue the current adapter architecture: application surfaces depend on typed repositories and `@missa/contracts`; infrastructure packages own SQL, providers, queues, and worker mechanics. UI components should consume view models that expose truthful domain states rather than raw database or crawler fields. Preserve the repository's explicit compatibility/relational cutover flags: current Missa mixes legacy snapshot-backed engines with newer normalized relational repositories, so the overhaul cannot assume every domain is already fully relational.

Each integration needs a concise contract record:

```text
owner
input schema and version
authentication/authorization
idempotency identity
transaction boundary
timeout and retry policy
durable receipt/evidence
cache invalidation
privacy/redaction
observability and operator recovery
```

#### Postgres/Neon boundary

Use one Postgres transaction for each authoritative state transition, including its audit/outbox record. Neon recommends HTTP queries for one-shot operations and `Pool`/`Client` when session semantics or interactive multi-query transactions are required; serverless connections must remain request-scoped. Roles used for JWT/RLS must not have `BYPASSRLS`. [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) and [connection pooling](https://neon.com/docs/connect/connection-pooling)

The current worker code correctly recognizes that transaction-pooled connections are not safe for holding session locks across external network work. Preserve that separation: claim or version-check quickly, perform external work outside the transaction, then reconcile through a new guarded transaction.

#### No new API gateway or service mesh

Missa does not presently need an enterprise API gateway, service mesh, or ESB. Next.js, Railway workers, Postgres, and Redis form a small enough topology that explicit typed boundaries, request IDs, durable operation records, and centralized authorization are more valuable than another routing/control plane.

### Microservice and worker integration patterns

Missa should remain a modular application with independently deployed workers, not fragment into feature microservices during the redesign.

Use these patterns:

- **Transactional outbox:** write domain state and async intent in the same transaction; dispatch after commit.
- **Idempotent consumer:** unique logical operation keys and payload hashes prevent duplicate effects.
- **Optimistic concurrency:** expected revision/version protects user and worker writes.
- **Lease/claim with recovery:** workers claim bounded work; stale claims become recoverable with explicit policy.
- **Circuit breaker/backoff:** provider failures stop hot retry loops, while durable work remains visible.
- **Bulkhead:** ingestion failures must not consume the web application's database or connection budget.
- **Reconciliation:** ambiguous provider outcomes become `outcome_unknown`, then resolve by provider reference, webhook, status lookup, or manual receipt before retry.

Do not implement a distributed Saga framework merely to rename these contracts. For multi-step external operations, use an explicit durable workflow with compensating actions only where reversal is possible and truthful.

### Event-driven integration

Missa already has the foundations for an event-oriented model: append-only audit records, outbox concepts, idempotency keys, provider receipts, worker telemetry, and publication gates. An active outbox dispatcher was not verified in this research pass, so `outbox_events` is an architectural seam rather than proof of a functioning event bus. Standardize a domain event envelope rather than inventing feature-specific messages:

```text
eventId
eventType
schemaVersion
aggregateType
aggregateId
aggregateRevision
occurredAt
actor
correlationId
causationId
idempotencyKey
redactedPayload or payloadReference
```

Events describe facts such as `OpportunityPublicationApproved`, `TrackerStatusChanged`, or `ExternalReceiptConfirmed`. Commands such as `ApproveOpportunityPublication` remain distinct. Cache invalidations, analytics, notifications, and projections may consume committed facts; they must not infer the fact from a button click or queue receipt.

Avoid full event sourcing for every product record. Use append-only events where audit, replay, external effects, approvals, or reconciliation justify them, while retaining ordinary relational current-state tables as operational projections.

### Workflow integration

Workflow should be used for long-lived coordination, human pauses, retries, and recovery—not ordinary database CRUD.

Recommended contract:

1. A Server Action or Route Handler validates and commits an operation plus outbox/event.
2. It starts the workflow asynchronously with a stable logical operation ID and returns `202` plus a run ID.
3. `use workflow` contains orchestration only.
4. Every database or provider side effect runs inside a `use step` function.
5. Each step reuses a stable idempotency key; completed results are persisted and retry-safe.
6. `defineHook` plus runtime schema validation handles editorial approval or external callbacks.
7. The final guarded transaction changes canonical state.
8. Only after commit are public cache tags and mounted SWR resources invalidated.

Workflow documentation describes persisted step results and retryable steps; hook tokens can resume a specific execution. [Workflow documentation](https://useworkflow.dev), [`defineHook`](https://useworkflow.dev/docs/api-reference/workflow/define-hook), and [Vercel's Workflow introduction](https://vercel.com/blog/introducing-workflow)

Existing Workflow 4 behavior must be inventoried before adopting this pattern broadly. Do not mix a v4-to-v5 migration into the first interface slice.

### Cache and client-state interoperability

Use three explicit layers:

- **Server cache:** public, stable, non-personalized projections only; tag by domain entity/collection.
- **Request/session reads:** dynamic or `no-store` when identity, permissions, saved state, or private data affects the result.
- **SWR cache:** mounted client resources that require live freshness or optimistic interaction.

After a committed mutation:

1. invalidate the narrow Next cache tag/path;
2. return the canonical new version/receipt;
3. update or revalidate the matching SWR key if that resource is mounted.

Never let `router.refresh()`, SWR `mutate()`, or a successful animation stand in for a durable receipt. Next.js supports tag/path revalidation from Server Actions and Route Handlers. [Next.js caching and revalidation](https://nextjs.org/docs/app/guides/caching-without-cache-components)

### Flag interoperability

Evaluate overhaul flags server-side and pass only the chosen surface/variant into the component tree. Identification should return the minimum stable account/team attributes. Use separate development, preview, and production outcomes with a conservative fallback.

Flags control **exposure**, not permission, publication, workflow status, or database schema. A disabled flag must leave both the old and new paths operating on the same canonical repositories and contracts. This makes rollback a presentation change rather than a data migration. Vercel documents environment, target, rule, and fallback evaluation plus observability for server evaluations. [Vercel Flags](https://vercel.com/docs/flags/vercel-flags), [evaluation order](https://vercel.com/kb/guide/how-vercel-flags-are-evaluated), and [observability](https://vercel.com/docs/flags/observability)

### Integration security patterns

- Centralize session verification in a server-only data access layer, but enforce resource-level authorization at every command boundary.
- Validate all external and client input; validate important repository output where disclosure safety depends on its shape.
- Verify webhook signatures over the correct raw payload, enforce timestamp tolerance, and deduplicate provider event IDs.
- Store secrets only in the runtime that needs them; never serialize flags secrets, provider tokens, database credentials, or internal source metadata into Client Components.
- Use stable idempotency keys without placing sensitive data in the key.
- Encrypt sensitive provider tokens at rest, scope them minimally, record consent, rotate/revoke them, and make disconnection recoverable.
- Keep public and private cache variants unmistakably separate; personalized responses remain private and non-shared.
- Attach request, correlation, causation, operation, workflow-run, and provider-reference IDs to structured logs without logging confidential payloads.
- Treat every admin, cron, worker-control, and revalidation endpoint as privileged infrastructure.

### Vertical-slice integration contract

The first opportunity overhaul slice should prove the whole pattern:

```text
Public opportunities page
  -> Server Component reads published catalogue projection
  -> URL owns search/filter/sort state
  -> opportunity tile renders typed disclosure view model
  -> detail route reads the same canonical repository

Authenticated save/follow/report
  -> existing Route Handler, or a future narrowly scoped Server Action,
     validates account, object, command, and idempotency
  -> Postgres transaction records relationship/event/receipt
  -> targeted cache and SWR invalidation

Background opportunity updates
  -> Railway/BullMQ worker processes bounded source work
  -> publication gate remains canonical in Postgres
  -> approved committed event invalidates public catalogue tags

Temporary release flag
  -> server chooses old or new interface
  -> both interfaces use the same contracts and durable state
```

This slice is complete only when list, filters, detail, unknown/evidence states, authentication transition, save/follow, responsive behavior, accessibility, loading/error states, observability, rollout, and rollback work together.

### Cross-integration findings and confidence

- **High confidence:** REST plus typed in-process contracts are sufficient; GraphQL, gRPC, a service mesh, and a new API gateway are unnecessary now.
- **High confidence:** Postgres must remain authoritative; queues/workflows transport and orchestrate; caches and flags project or control exposure.
- **High confidence:** the existing idempotency, audit, publication-gate, worker-telemetry, and repository patterns should be consolidated rather than replaced.
- **Medium confidence:** whether Workflow should supersede any Postgres-claimed or BullMQ rollback lane; this requires an exact operational inventory and cost/retention analysis.
- **Medium confidence:** the precise server-cache tag taxonomy until the opportunity/profile repository graph is mapped route by route.
- **Research gap:** production topology, the active ingestion-v2 transport, queue/claim depths, retry histories, connection limits, outbox dispatch, and current Workflow usage require live operational verification; repository code alone cannot certify them.

### Integration sources and evidence boundary

Current official sources were consulted for Next.js actions/handlers/caching/security, Neon serverless transactions and pooling, Redis Streams, Workflow, and Vercel Flags. Repository evidence establishes current Missa code patterns but not production health. The Miro design reference affects visual/component language only; it does not define any integration or data-authority contract.

## Architectural Patterns and Design

### System architecture pattern: modular monolith with durable worker lanes

Missa should remain a **modular monolith at the product/domain level with independently deployed worker lanes**. This matches the current operational shape: one Next.js web application, shared TypeScript packages, one authoritative Neon/Postgres database, and Railway/container processes for work that cannot safely finish inside a web request.

This pattern offers the best balance for the overhaul:

- shared contracts and atomic transactions remain straightforward;
- product journeys can be refactored across domains without distributed release coordination;
- workers can scale and recover independently where runtime behavior warrants it;
- package boundaries can be strengthened before any service boundary is considered;
- the team avoids network, schema-evolution, observability, and consistency costs that microservices would add prematurely.

The system should not be described as a traditional monolith with arbitrary cross-imports. Each bounded context owns its commands, repositories, schemas, events, policies, and presentation models. Cross-domain work passes through explicit application services or committed events, not direct table manipulation from UI code.

Recommended high-level structure:

```text
apps/web
  composition, routes, server rendering, HTTP boundaries, UI

packages/contracts
  public schemas, command/result types, event envelopes

packages/design-system
  tokens, primitives, disclosure patterns, state components

packages/<domain>
  domain rules and application services

packages/<domain>-adapters
  Postgres, providers, queues, files, external APIs

apps/workers or worker entrypoints
  bounded ingestion, review, delivery, reconciliation, projections
```

The exact package migration should be incremental; this is the target dependency shape, not authorization for a bulk directory move.

### Evolution pattern: strangler by complete product journey

Use a strangler-style replacement inside the existing application. AWS includes the Strangler Fig pattern among its modernization patterns because new capability can replace old capability incrementally without a single cutover. [AWS cloud design patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/introduction.html)

For Missa, the replacement unit is a **vertical product journey**, not a CSS file or isolated component:

1. define the shared domain and disclosure contracts;
2. build the new server read model and interface against the same durable authority;
3. expose it through a temporary server-side flag;
4. run accessibility, responsive, interaction, performance, and data-equivalence checks;
5. expand exposure gradually;
6. remove the old route/components and then retire the flag.

The first slice is Opportunities: catalogue, URL-owned discovery controls, opportunity tile, detail disclosure, source/evidence treatment, save/follow/report, authentication transition, and all loading/empty/error/unknown states. Subsequent slices follow creator journeys, then organization operations, then marketing—not whichever page is visually easiest.

### Domain boundaries and ownership

The architecture should preserve and formalize these boundaries:

| Domain | Owns | Must not own |
|---|---|---|
| Identity/Profile | creator identity, practices, preferences, privacy, integrations | tracker progress or Work file history |
| Opportunities | source-backed opportunity identity, versions, disclosure, availability | a creator's submission outcome |
| Publication | evidence review, destination reconciliation, content approval, publication gate | crawler success as publication truth |
| Tracker | creator-opportunity relationship and progress | canonical Work files or external receipt truth |
| Library | Work identity, files, versions, rights, presentation | application execution state |
| Office/Application | pinned application revision, preparation, approval, handoff, receipts, recovery | mutable opportunity truth after pinning |
| Organization | membership, open calls, intake, review, decisions, delivery | creator-private profile/work outside consent |
| Messaging/Calendar | external projections, provider attempts and reconciliation | primary application or submission truth |
| Platform Operations | governed controls, audit, support and telemetry | bypassing domain authorization or publication gates |

Domain packages should expose task-oriented application services such as `browsePublishedOpportunities`, `saveOpportunity`, `approvePublication`, or `confirmExternalReceipt`. Generic database repositories remain infrastructure details.

### Frontend architecture: server shell, client islands

The interface should follow the Server Component/Client Component composition model:

- pages and layouts are server-owned by default;
- server code creates authenticated, disclosure-safe view models;
- client boundaries wrap only browser state, events, drag/drop, optimistic controls, or live refresh;
- interactive leaves receive serializable domain/view data rather than database clients or provider objects;
- shared navigation, page structure, metadata, initial content, and non-interactive tiles remain server-rendered.

Next.js recommends Server Components for database/API access close to the source and Client Components only for state, events, lifecycle, browser APIs, and custom hooks. Its production guidance also warns against unnecessary client boundaries and internal Route Handler calls from Server Components. [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) and [production checklist](https://nextjs.org/docs/app/guides/production-checklist)

This should reduce hydration cost without sacrificing interaction. A `use client` reduction target must be based on route bundle and interaction measurements, not a repository-wide count.

### Design-system architecture

The design system should be split into five governed layers:

```text
Foundations
  color, type, space, radius, motion, breakpoints, elevation, focus
        ↓
Primitives
  button, link, input, checkbox, dialog, popover, tabs, table
        ↓
Disclosure patterns
  opportunity tile, fact row, evidence row, status, source, unknown state,
  deadline/fee/eligibility group, action cluster, progressive detail
        ↓
Surface compositions
  marketing, creator, organization/operations density and navigation
        ↓
Product journeys
  opportunities, tracker, inbox, calendar, library, office, review, admin
```

Architectural rules:

- Root `DESIGN.md` and the resolved semantic tokens remain canonical.
- `miro/DESIGN.md` is a named reference layer, not an importable theme or automatic override.
- Base UI/shadcn own accessible interaction mechanics; Missa components own visual and domain semantics.
- Product code must not invent primitive control styling or raw colors locally.
- Domain disclosure patterns must make known, unknown, unavailable, unverified, derived, and actionable states distinguishable without relying on color alone.
- Marketing, creator, and organization registers share foundations and primitives but may select spacious, comfortable, or compact density contracts.
- Components have explicit anatomy, variants, states, accessibility behavior, responsive behavior, and content limits.

A component workshop should be backed by deterministic fixtures for long titles, missing facts, conflicting evidence, expired deadlines, source-image failure, dense organization rows, permissions, and every async state. Visual snapshots alone are insufficient; keyboard, focus, accessible-name, state-announcement, and reduced-motion behavior must be executable contracts.

### Design principles and dependency direction

Apply hexagonal/ports-and-adapters ideas selectively: domain and application logic depend on interfaces; Postgres, Redis, providers, Workflow, and Next handlers implement or call those interfaces. AWS's current hexagonal-architecture guidance uses domain-driven design to separate business logic from infrastructure concerns. [AWS hexagonal architectures](https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/hexagonal-architectures.html)

Required dependency direction:

```text
UI / HTTP / worker entrypoint
        ↓
application command or query
        ↓
domain policy and contract
        ↓
port/interface
        ↓
Postgres/provider/queue adapter
```

Prohibited shortcuts:

- components importing SQL clients;
- route handlers encoding publication policy independently of domain services;
- workers updating public state without the publication gate;
- provider webhooks directly setting user-visible completion without reconciliation;
- flags changing authorization or durable state-machine meaning;
- compatibility and relational stores both accepting an uncoordinated authoritative write.

### Data architecture patterns

#### Relational current state plus selective append-only history

Use normalized relational current-state tables for ordinary product operations. Add append-only history where audit, version pinning, external effects, approvals, or reconciliation justify it. Do not event-source the whole product. Azure's current pattern guidance explicitly notes that event sourcing is costly and should be adopted only where auditability and historical reconstruction justify the complexity. [Azure Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

#### Transactional outbox

Where a committed business change must cause asynchronous work, write the state change and outbox record atomically. A separate dispatcher claims unpublished events, publishes/starts work, and records delivery. This avoids the dual-write failure in which data commits but the message is lost, or a message is sent for a transaction that failed. [Azure Transactional Outbox](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)

Before depending on this pattern, Missa must implement or verify the dispatcher; the presence of `outbox_events` alone is not operational proof.

#### CQRS-lite read projections

Use distinct query/view models for complex public disclosure and operational queues, but keep them in the same Postgres authority unless measurement proves a separate read store is necessary. Azure notes that CQRS can improve query models and independent scaling but creates synchronization complexity when separate stores are introduced. [Azure CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)

For Missa this means:

- commands enforce domain rules and expected revisions;
- query repositories produce disclosure-safe view models;
- materialized views or projection tables are introduced only for measured hot paths;
- projections carry enough version/freshness metadata internally to detect lag without exposing crawler metadata to users.

### Scalability and performance patterns

Scale the measured bottleneck rather than decomposing the system pre-emptively:

- **Web:** server render by default, stream slow independent sections, parallelize independent reads, and lazy-load heavy client interactions.
- **Database:** keep web and database regions aligned, use bounded connection pools, short transactions, query budgets, indexed cursor pagination, and explicit tenant/public predicates.
- **Workers:** claim bounded batches, cap concurrency per provider/domain, use exponential backoff with jitter, and isolate worker connection budgets from web traffic.
- **Cache:** cache public stable projections with explicit tags; never share personalized or permission-sensitive output.
- **Assets:** optimize images/fonts, reserve dimensions, and enforce payload budgets.
- **Build/CI:** use Turborepo task graphs and caching only for deterministic outputs with declared environment inputs.

Next.js's production guidance recommends server rendering, route code-splitting, parallel data fetching, streaming, deliberate caching, optimized fonts/images, bundle analysis, and field Core Web Vitals. [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)

Performance gates should include route-level JavaScript, server timing/query count, LCP/INP/CLS field data, cache hit/miss behavior, database connection usage, worker throughput/lag, and the time from committed publication to visible catalogue projection.

### Resilience and consistency patterns

- Use optimistic concurrency for user-edited and workflow-controlled records.
- Treat all queue/workflow/provider delivery as at-least-once unless independently proven otherwise.
- Record `outcome_unknown` for ambiguous external results; reconcile before retrying non-idempotent effects.
- Use circuit breakers and capped exponential backoff for provider incidents.
- Separate transient, permanent, conflict, policy, and unknown failure classes.
- Pin opportunity, Work, policy, compiler, and workflow versions for active applications.
- Keep compensation explicit and truthful; some actions cannot be reversed and require reconciliation instead.
- Detect stuck claims, pending receipts, stale worker heartbeats, projection lag, and expired approvals through operational queries and alerts.

### Integration and communication patterns

The architecture standardizes four communication modes:

| Mode | Use | Authority implication |
|---|---|---|
| Direct in-process query | Server Component/application service to repository | Reads current durable state |
| HTTPS command/webhook | Browser or provider to Next boundary | Validated request; success reflects committed intent/result |
| Claimed async work | Railway worker, Workflow step, or queue consumer | Retryable execution; never business truth alone |
| Committed domain event | Projection, notification, analytics, cache invalidation | Fact already accepted by durable authority |

Avoid point-to-point worker calls. Workers coordinate through durable claims/events and provider references. This keeps restarts, deployments, and partial failures observable and recoverable.

### Security architecture patterns

Security belongs at every boundary rather than in a gateway added later:

- server-only session and identity resolution;
- object/tenant-level authorization on every read and command;
- fail-closed authority selection when relational storage is required;
- schema validation and output allowlisting;
- raw-body signature verification and provider-event deduplication for webhooks;
- separate credentials and least-privilege database roles for web, workers, migrations, and read-only operations;
- secret-free Client Component props and logs;
- private/no-store treatment for personalized output;
- controlled admin and worker operations with audit, expected state, expiry, and idempotency;
- dependency, static, dynamic, and AI-assisted review as complementary controls, not interchangeable certification.

The Next.js production checklist recommends protecting Server Actions, keeping secrets server-side, limiting public environment variables, and applying CSP. [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)

DeepSec should enter only after threat boundaries and source-sharing rules are approved. It supplements—not replaces—authorization tests, dependency review, webhook tests, secret scanning, and manual validation.

### Deployment and operations architecture

Keep deployment responsibilities explicit:

```text
Vercel
  Next.js web, server rendering, Route Handlers, bounded cron fallback

Neon/Postgres
  canonical relational state, compatibility snapshots during migration,
  audit, receipts, idempotency, claims, publication gate, projections

Railway/container workers
  long-running ingestion, enrichment, review, delivery, reconciliation

Redis
  auxiliary rate limiting and retained rollback/legacy queue paths

Workflow
  selected long-running orchestration after v4 inventory and proof
```

Each deployable must publish readiness, structured error categories, version/commit identity, database migration compatibility, and durable heartbeat where long-lived. Deployments do not prove processing health; production database state, worker telemetry, queue/claim state, and exact public-route probes are the operational authorities.

Migration sequencing must follow expand/migrate/contract:

1. add backward-compatible schemas/contracts;
2. deploy readers/writers that tolerate both versions;
3. backfill or migrate with checkpoints and reconciliation;
4. switch authority through an explicit reviewed flag/configuration;
5. observe and verify;
6. remove compatibility paths only after rollback and retention windows close.

### Architecture decision records and enforcement

Every consequential adoption should receive a short ADR covering context, decision, alternatives, consequences, rollback, ownership, and expiry/review date. Initial ADR candidates:

1. canonical design-system layers and ownership;
2. vertical-slice strangler migration and flag lifecycle;
3. Server Component/Route Handler/optional Server Action boundary;
4. client freshness and SWR eligibility;
5. outbox dispatcher and event schema;
6. Workflow 4 production scope and version policy;
7. Postgres-claim versus BullMQ ingestion-v2 authority;
8. Turborepo task/environment contract;
9. security scanning and DeepSec data/cost boundary.

Enforce architecture with package exports, lint/import rules, schema tests, contract tests, migration checks, visual/a11y tests, and CI ownership—not documentation alone.

### Architectural trade-offs and confidence

- **High confidence:** modular monolith plus independent workers is the appropriate target; microservice decomposition would add risk without solving the refactor's core problems.
- **High confidence:** vertical-slice strangling is safer than parallel page-by-page restyling or a framework rewrite.
- **High confidence:** a layered design system and disclosure patterns must sit above primitives and below product journeys.
- **High confidence:** relational current state plus selective events/outbox is preferable to product-wide event sourcing.
- **Medium confidence:** exact future package boundaries until a dependency graph and duplicate-component inventory are produced.
- **Medium confidence:** Workflow's final role until current v4 usage, Postgres claim lanes, and BullMQ rollback responsibilities are operationally verified.
- **Unresolved:** the active ingestion-v2 deployment path, outbox dispatcher, production connection budgets, and measurable client/server bundle baselines.

### Architecture research evidence boundary

Current official material from Next.js, AWS Prescriptive Guidance, Microsoft Azure Architecture Center, Neon, Redis, Workflow, and Vercel informed the patterns above. These sources describe patterns and trade-offs; repository evidence determines whether Missa currently implements them. The attached Miro system contributes visual reference patterns only and does not override Missa's domain, authority, deployment, or security architecture.

## Implementation Approaches and Technology Adoption

### Technology adoption strategy

Adopt the overhaul as a sequence of reversible capabilities, not a coordinated big-bang release. The legacy and replacement interfaces should coexist only while a vertical slice is being proven; every coexistence period needs an owner and removal date. AWS describes the Strangler Fig pattern as an incremental modernization approach that reduces transformation risk by letting old and new implementations coexist before the old path is eliminated. [AWS Strangler Fig pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-aspnet-web-services/fig-pattern.html)

The adoption unit is a user journey with one durable authority:

```text
baseline -> contract -> build -> verify -> flag -> canary -> expand -> retire
```

Each slice must define before coding:

- user outcome and scope;
- current and target routes/components;
- domain and disclosure contracts;
- data authority and compatibility mode;
- flag owner, fallback, exposure plan, and expiry;
- accessibility, responsive, performance, and data-equivalence baselines;
- rollback procedure and database compatibility window;
- telemetry and success measures.

### Seven-phase implementation program

#### Phase 0 — Baseline and authority inventory

Create a source-backed inventory of:

- public, creator, organization, admin, authentication, and provider routes;
- Server Component and Client Component boundaries;
- Route Handler commands and shared contract schemas;
- compatibility engines versus relational repositories and cutover flags;
- component duplication, raw token values, one-off controls, and accessibility debt;
- web, Neon, Railway, Redis, cron, provider, queue/claim, and Workflow topology;
- route bundles, query counts/timing, Core Web Vitals, error states, and critical journey test coverage.

Outputs: dependency graph, route/domain matrix, interface inventory, authority map, production-topology verification, baseline dashboard, migration backlog, and initial ADRs. No visual replacement starts until the Opportunities slice has a trustworthy baseline.

#### Phase 1 — Design-system foundation

Reconcile root `DESIGN.md`, `apps/web/app/globals.css`, content/naming guidance, the Chill Subs disclosure study, current product fixtures, and `miro/DESIGN.md` into one governed specification. Preserve Missa's white canvas, Aubergine semantics, typography, density modes, wordmark, and truthful unknown states; import Miro-inspired structure only where it improves hierarchy, rhythm, modularity, and progressive disclosure.

Deliver:

- token schema and generated/documented CSS variables;
- foundational typography, layout, breakpoint, focus, motion, and density contracts;
- Base UI/shadcn-backed primitives with stable anatomy and variants;
- opportunity disclosure primitives and composite patterns;
- deterministic fixtures for long, missing, conflicting, loading, empty, unavailable, permission-denied, and error states;
- component workshop pages and usage/deprecation guidance;
- lint/import rules preventing new raw colors and duplicate primitives.

#### Phase 2 — Engineering foundation

Introduce Turborepo around existing deterministic scripts rather than rewriting build behavior. Start with package-owned `typecheck`, `lint`, unit tests, contract tests, and builds; declare dependencies, outputs, inputs, and environment variables accurately. Add affected-package CI only after the full task graph is trustworthy.

Establish:

- deterministic test environments and fixture builders;
- Playwright functional, visual, responsive, and accessibility suites;
- package-boundary and circular-dependency checks;
- route bundle and server/query performance budgets;
- structured correlation/operation identifiers across web and workers;
- flag declaration, ownership, expiry, and cleanup automation;
- migration, schema compatibility, and rollback checks.

#### Phase 3 — Opportunities pilot

Implement the complete opportunity journey:

- server-rendered catalogue and URL-owned search/filter/sort state;
- responsive filter bar and mobile sheet;
- tile/list disclosure patterns;
- detail page with facts, eligibility, fee, deadline, location, organization confirmation, source/evidence, unknowns, and actions;
- save, follow, report, and authentication transitions;
- loading, empty, error, unavailable, closed, stale/changed, and missing-image states;
- public/private cache behavior and targeted invalidation;
- observability and a temporary server-side release flag.

Old and new interfaces must use the same canonical repository and mutation contracts. Canary cohorts should begin with internal/preview users, then a small stable production cohort, then measured expansion. Google SRE describes canaries as partial, time-limited releases evaluated against a control, reducing the amount of error budget exposed to defects. [Google SRE: Canarying Releases](https://sre.google/workbook/canarying-releases/)

#### Phase 4 — Creator-product migration

Migrate by connected workflow:

1. opportunity save/follow into Tracker;
2. Tracker status and pinned application revision;
3. Calendar and Inbox projections;
4. Library Work selection/versioning;
5. Profile preferences and privacy;
6. Office preparation, approval, handoff, receipt, and recovery.

Use SWR only for resources with a documented live-freshness need. Do not let optimistic UI conflate “requested,” “committed,” “in progress,” “outcome unknown,” and “confirmed.”

#### Phase 5 — Organization and operations migration

Apply the compact density register to organization setup, open calls, submission intake, review assignment, decisions, delivery, insights, and governed platform operations. Prove keyboard navigation, bulk actions, permission boundaries, optimistic concurrency, audit, and recovery before increasing density or automation.

#### Phase 6 — Platform durability tracks

Run platform changes as separately reversible tracks:

- verify and standardize the outbox dispatcher;
- decide the active ingestion-v2 Postgres-claim/BullMQ boundary;
- inventory and stabilize Workflow 4 usage;
- pilot one durable workflow only where waits/retries/recovery justify it;
- prove worker budgets, backpressure, reconciliation, and operator controls;
- onboard DeepSec scaffold-first after model/source/cost approval.

#### Phase 7 — Consolidation and retirement

Delete retired components, styles, flags, compatibility routes, and schemas only after exposure, rollback, and retention windows close. Update ADRs, ownership, runbooks, architecture diagrams, product language, and test inventories. Run a final cross-surface coherence and accessibility audit.

### Development workflow and tooling

Recommended change lifecycle:

1. ADR or slice brief for consequential boundaries.
2. Contract and fixture changes first.
3. Primitive/pattern work in isolation.
4. Vertical integration against real repositories or representative relational fixtures.
5. Focused tests locally; affected task graph in CI.
6. Preview deployment and browser inspection at required breakpoints.
7. Production-like data and permission rehearsal without external effects.
8. Flagged canary, observation window, expand or rollback.
9. Retirement PR and flag cleanup.

Keep PRs aligned to one vertical slice or foundation contract. Generated visual changes must be explicitly reviewed; visual snapshots should never be bulk-accepted without inspection.

### Testing and quality assurance

Use a layered test portfolio:

| Layer | Required evidence |
|---|---|
| Tokens/primitives | type, unit, state/anatomy, keyboard, focus, contrast |
| Domain contracts | schemas, state transitions, permissions, unknown/evidence semantics |
| Repositories | relational integration, transaction, concurrency, idempotency, publication predicates |
| Routes/actions | authentication, authorization, validation, cache headers, replay and failure behavior |
| Journeys | browser interaction across list/detail/action/recovery paths |
| Visual | deterministic screenshots for key states and breakpoints |
| Accessibility | axe plus manual keyboard, screen-reader semantics, zoom/reflow, reduced motion |
| Performance | bundle, server timing, query count, CWV lab and field measures |
| Workers/workflows | retry, duplicate delivery, crash recovery, ambiguous provider outcome, reconciliation |
| Rollout | flag targeting, fallback, observability, rollback, retirement |

Playwright supports committed visual baselines through `toHaveScreenshot()`, but warns that rendering varies across environments; generate and compare baselines in a controlled CI environment. [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

Playwright's accessibility guidance recommends combining automated axe scans with manual assessment and inclusive testing because automated checks detect only a subset of accessibility problems. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

Missa's acceptance target remains WCAG 2.2 AA, with 44px public touch targets as an internal usability standard even though WCAG 2.2 AA's Target Size Minimum is 24px or sufficient spacing. [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) and [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### Deployment and operational practices

Every vertical slice needs:

- a preview environment with safe representative data;
- migration compatibility across the previous and next deployment;
- explicit feature-flag fallback;
- structured release annotation and version identity;
- canary cohort, comparison metrics, observation window, and stop conditions;
- rollback that does not require reverting already-valid durable data;
- post-release verification of exact routes and durable state.

Operational dashboards should separate:

- web availability/latency/errors;
- database connections, query latency, locks/conflicts, and transaction failure;
- worker heartbeat, claim depth/age, throughput, retries, and terminal failures;
- workflow runs, waiting hooks, step retries, and stuck execution;
- provider webhook verification, duplicate delivery, reconciliation lag, and unknown outcomes;
- publication-gate counts and time from evidence readiness to public visibility;
- flag exposure and outcome/error comparison;
- user-experience measures and accessibility regressions.

OpenTelemetry defines traces, metrics, logs, and baggage as complementary signals and provides context propagation for following a request across components. [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/) and [traces](https://opentelemetry.io/docs/concepts/signals/traces/)

### Performance targets

Establish current per-route baselines before choosing numeric budgets beyond published user-experience thresholds. Initial external targets at the 75th percentile, segmented by mobile and desktop:

- LCP at or below 2.5 seconds;
- INP at or below 200 milliseconds;
- CLS at or below 0.1.

These are current Core Web Vitals “good” thresholds, not proof that every Missa workflow feels fast. Add product measures such as time to useful opportunity results, filter response, detail disclosure availability, save confirmation, organization queue action latency, and publication projection delay. [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

### Team organization and skills

Assign explicit stewardship rather than creating a centralized team that becomes a bottleneck:

- **Design-system owner:** tokens, primitives, governance, accessibility and visual review.
- **Journey owner:** complete product behavior and migration for a vertical slice.
- **Domain owner:** rules, contracts, repository authority and data migration.
- **Platform owner:** CI/task graph, deploys, flags, telemetry, workers and Workflow.
- **Security/privacy owner:** threat boundaries, provider credentials, DeepSec policy and finding triage.
- **Content/data-disclosure owner:** terminology, evidence/unknown states and user-facing truth.

Required skills include React Server Component composition, accessible interaction engineering, Postgres transactions/concurrency, contract/schema design, browser automation, performance analysis, event/idempotency patterns, production observability, and safe rollout management.

### Cost and resource management

Control cost through architecture and measurement:

- retain the existing framework and avoid duplicate implementation during a Svelte rewrite;
- limit old/new coexistence with explicit retirement dates;
- use Turborepo caching only for deterministic tasks and measure CI minutes saved;
- bound worker concurrency, database pools, retries, payload sizes, and retention;
- cache public stable projections while keeping private data uncached/shared nowhere;
- cap Workflow storage/run payloads and use it only for durable coordination;
- require budget/duration limits and approved model routing for DeepSec;
- measure flag-provider, remote-cache, observability, Redis, Workflow, and database costs independently.

### Risk assessment and mitigation

| Risk | Mitigation and gate |
|---|---|
| Big-bang interface failure | vertical slices, server flags, stable cohorts, tested fallback |
| New visual system diverges from Missa | canonical token/content review; Miro remains reference-only |
| Duplicate old/new business logic | shared repositories/contracts; UI-only flag boundary |
| Personalized data cached publicly | explicit cache classification and response tests |
| Optimistic UI overstates completion | durable receipt/status vocabulary and reconciliation states |
| Compatibility and relational double authority | fail-closed selector, single-writer cutover, reconciliation |
| Worker duplicate effects | idempotency keys, unique constraints, receipts, recovery tests |
| Outbox assumed operational | verify/implement dispatcher and lag monitoring before reliance |
| Workflow adoption creates new debt | one bounded v4 pilot; no v5 migration in UI program |
| Redis/BullMQ topology misunderstood | live deployment and queue/claim verification before change |
| Flags become permanent | owner, expiry, removal check, maximum coexistence window |
| Visual snapshots hide semantic defects | interaction, contract, accessibility and manual review |
| Security scanner creates false confidence | bounded DeepSec plus conventional secure-development controls |
| Dirty worktree loses user work | isolated ownership, scoped diffs and non-destructive migration |

## Technical Research Recommendations

### Implementation roadmap

Start with Phase 0 and Phase 1 in parallel only where their ownership does not overlap. The first releaseable milestone is not “new cards”; it is the complete flagged Opportunities slice backed by the canonical disclosure and mutation contracts. Do not begin creator/organization migrations until this slice proves the design system, data boundaries, testing, rollout, and retirement mechanics.

### Technology stack recommendations

- Retain Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI/shadcn, Neon/Postgres, and Railway workers.
- Do not migrate Missa to SvelteKit.
- Add SWR only for documented live client resources.
- Adopt Turborepo incrementally for deterministic workspace tasks.
- Use provider-isolated, expiring server flags for rollout.
- Stabilize Workflow 4 and pilot it only for justified durable coordination.
- Preserve Postgres claiming/BullMQ rollback until ingestion-v2 production authority is verified.
- Initialize DeepSec only through an approved scaffold-first, cost-bounded security track.

### Skill-development requirements

Prioritize practical capability in accessible component engineering, Server/Client Component composition, domain/view-model design, Postgres concurrency and idempotency, Playwright testing, performance measurement, durable workflows, structured telemetry, and canary operations. Svelte expertise is not on the critical path.

### Success metrics and KPIs

Measure outcomes in five groups:

**Product and disclosure**

- opportunity search-to-detail and detail-to-save completion;
- unknown/evidence state comprehension and reduction in misleading disclosures;
- creator and organization journey task completion and recovery;
- support issues attributable to navigation, status ambiguity, or missing information.

**Interface quality**

- duplicate primitive/pattern reduction;
- raw token violations and deprecated component usage;
- responsive overflow, keyboard, focus, and serious/critical accessibility defects;
- visual regression review rate and escaped regressions.

**Performance**

- LCP, INP, CLS at p75 by route/device;
- route JavaScript and hydration cost;
- server timing, query counts, cache behavior, and database connections;
- worker throughput, claim age, retries, and reconciliation delay.

**Delivery and reliability**

- lead time, affected CI duration, change-failure rate, rollback time;
- canary stop/rollback effectiveness;
- flag age and cleanup compliance;
- stale workflow/worker/outbox records and recovery time.

**Architecture and security**

- routes using canonical domain contracts;
- compatibility authorities retired with reconciliation evidence;
- idempotency/replay test coverage for external effects;
- authorization and webhook verification coverage;
- validated security findings closed without representing scans as certification.

### Implementation research evidence boundary

Current primary documentation from AWS, Next.js, Playwright, W3C/WCAG, Google SRE, web.dev, OpenTelemetry, Turborepo, Vercel, Workflow, Neon, and Redis informed this implementation program. Repository inspection establishes current Missa patterns and gaps; it does not establish live production health or cost. Numeric delivery estimates are intentionally omitted until Phase 0 inventories dependency, ownership, and operational baselines.

## Research Synthesis and Executive Decision

### Executive summary

Missa should redesign the entire product. The current problem is not merely visual inconsistency: interface fragmentation, duplicated client orchestration, mixed compatibility/relational authority, uneven disclosure, and incomplete operational contracts compound each other. A cosmetic redesign would preserve those weaknesses behind new styling. A SvelteKit rewrite would multiply risk by replacing routing, rendering, authentication, API, test, component, and deployment contracts while leaving the underlying domain and authority problems to be solved again.

The durable answer is a **journey-by-journey strangler refactor on the existing Next.js/React platform**. Missa should establish a governed design system, formalize domain/view contracts, keep Postgres authoritative, and release complete vertical slices behind temporary server-evaluated flags. Server Components own initial authenticated and public reads; existing Route Handlers remain the current command/machine boundary; narrowly scoped Server Actions may be introduced only where they simplify Next-native form commands without duplicating APIs. Railway workers and selected durable workflows execute sustained work, while receipts, idempotency, publication, audit, and reconciliation remain in Postgres.

The first proof is the complete Opportunities experience. It must cover catalogue discovery, URL-owned filters, atomic tiles, detail disclosure, evidence and unknown states, save/follow/report, authentication transitions, responsive/accessibility behavior, cache separation, worker-fed updates, observability, canary exposure, rollback, and retirement. Only after this slice demonstrates the full delivery mechanism should the program expand into Tracker, Calendar, Inbox, Library, Profile, Office, organization operations, and marketing.

### Final technical decisions

| Question | Decision | Rationale |
|---|---|---|
| Redesign the frontend? | Yes, across the entire product | Current fragmentation is structural and journey-wide, not isolated styling debt |
| Adopt the Miro design literally? | No | Use hierarchy, rhythm, modularity, and progressive disclosure as references; Missa's canonical design and content rules remain authoritative |
| Move to Svelte/SvelteKit? | No | It is a full rewrite with no evidence that React causes the core problems |
| Keep Next.js/React? | Yes | Existing App Router, repository, authentication, test, deployment, and worker integration make in-place modernization lower-risk |
| Add SWR? | Selectively | Use only for live client freshness and optimistic mounted resources; do not duplicate authoritative server reads |
| Add Turborepo? | Yes, incrementally | Formalize deterministic workspace tasks and affected CI after task/environment contracts are verified |
| Use Flags SDK? | Yes, temporarily | Decouple deploy from release and enable reversible vertical-slice exposure; flags never own authorization or durable state |
| Expand Workflow now? | Not broadly | Inventory and stabilize existing Workflow 4 first; pilot one justified long-running orchestration independently |
| Run DeepSec init now? | No | Require explicit source-sharing, model, Vercel-project, cost, duration, and triage approval; begin scaffold-first |
| Introduce GraphQL/gRPC/service mesh? | No | REST, typed in-process contracts, and durable worker claims are sufficient at current scale |
| Split into microservices? | No | Use a modular monolith with independently deployed worker lanes and explicit bounded contexts |
| Make the product event-sourced? | No | Retain relational current state with selective append-only audit/events and a verified transactional outbox |

### Target architecture

```text
                         ┌───────────────────────────────┐
                         │       Missa interfaces         │
                         │ marketing / creator / org ops  │
                         └───────────────┬───────────────┘
                                         │
                     Server Components / Route Handlers
                                         │
                         ┌───────────────▼───────────────┐
                         │ application commands/queries   │
                         │ domain policy + typed contracts│
                         └───────────────┬───────────────┘
                                         │
                       repositories / infrastructure ports
                                         │
             ┌───────────────────────────▼───────────────────────────┐
             │                 Neon/Postgres authority                │
             │ state · versions · gates · receipts · audit · claims  │
             └──────────────┬───────────────────────┬────────────────┘
                            │                       │
                    committed intent         public/private projections
                            │                       │
       ┌────────────────────▼───────────┐           ├─ Next server cache
       │ Railway workers / Workflow      │           └─ selective SWR cache
       │ retry · wait · reconcile        │
       └───────────────┬────────────────┘
                       │
             sources and providers
```

Redis remains auxiliary: shared rate limiting and retained rollback/legacy queue paths until the ingestion-v2 production transport is verified. Flags sit at the exposure boundary. They do not enter the domain or data-authority layers.

### Target design-system model

```text
Foundations
  semantic tokens · typography · spacing · density · focus · motion
      ↓
Accessible primitives
  Base UI/shadcn interaction mechanics with Missa styling
      ↓
Disclosure patterns
  tiles · fact rows · sources · evidence · unknowns · status · actions
      ↓
Surface compositions
  expressive marketing · calm creator · compact organization operations
      ↓
Complete product journeys
  Opportunities · Tracker · Calendar · Inbox · Library · Office · Review
```

The supplied Miro analysis contributes reference ideas at the composition and visual-rhythm levels. It must not overwrite Missa's semantic tokens, wordmark, typography, truthful state vocabulary, accessibility rules, or product-density registers.

### Strategic implication

Missa's technical advantage will not come from adopting the most tools. It will come from making complex opportunity and submission states understandable without weakening evidence, privacy, or durable operations. The design system and platform architecture therefore share the same job: expose the correct state, at the correct density, with the correct authority and recovery path.

## Final Implementation Roadmap

### Phase 0 — Establish the baseline

**Objective:** create the evidence required to plan and measure the overhaul.

**Deliverables:**

- route/domain/authority matrix;
- component and raw-token inventory;
- current compatibility versus relational ownership map;
- worker/queue/claim/Workflow production-topology verification;
- browser, accessibility, bundle, query, cache, and Core Web Vitals baselines;
- ADR backlog and slice dependency graph.

**Exit gate:** the Opportunities pilot has a signed-off current-state baseline, canonical repository, disclosure contract, cohort strategy, and rollback boundary.

### Phase 1 — Build the shared system

**Objective:** make the correct interface the easiest interface to build.

**Deliverables:**

- reconciled design-system specification;
- semantic tokens and density contracts;
- accessible primitives;
- opportunity disclosure patterns;
- deterministic component fixtures;
- component workshop and documentation;
- package/import/raw-style enforcement.

**Exit gate:** every state required by the Opportunities pilot exists as a tested system component rather than route-local styling.

### Phase 2 — Make delivery repeatable

**Objective:** create reliable engineering and rollout mechanics.

**Deliverables:**

- verified Turborepo task graph;
- focused and affected CI pipelines;
- deterministic visual environment;
- Playwright journey, responsive, visual, and accessibility suites;
- performance and query budgets;
- server flag convention with owner/expiry/removal checks;
- structured release and operation identifiers.

**Exit gate:** a vertical slice can be built, previewed, canaried, measured, rolled back, and retired without improvisation.

### Phase 3 — Prove Opportunities end to end

**Objective:** validate the product, design-system, data, and operational architecture through one complete journey.

**Deliverables:** catalogue, filters, tiles, detail, evidence/unknown states, actions, authentication transitions, cache behavior, accessibility, responsive behavior, telemetry, flag rollout, and old-path retirement.

**Exit gate:** measured improvement without authorization, disclosure, performance, accessibility, or data-equivalence regression; old interface and temporary flag removed.

### Phase 4 — Migrate creator journeys

**Order:** save/follow → Tracker → Calendar/Inbox → Library → Profile → Office.

Each slice repeats the same contract/build/verify/canary/retire process. Office durability remains tied to pinned revisions, separate readiness/action/outcome states, explicit approvals, idempotent side effects, receipts, and recovery.

### Phase 5 — Migrate organization and platform operations

**Order:** organization setup → open calls → intake → review → decisions → delivery → insights → governed platform operations.

Compact density, keyboard efficiency, bulk operations, permissions, optimistic concurrency, audit, and recovery are release requirements rather than later enhancements.

### Phase 6 — Strengthen platform durability

- verify or implement the outbox dispatcher;
- resolve the active Postgres-claim/BullMQ ingestion-v2 path;
- inventory Workflow 4 and pilot one justified orchestration;
- establish queue/claim, worker, provider, and reconciliation SLOs;
- approve and scaffold DeepSec under cost/data constraints.

These tracks do not block foundational UI work, but no slice may claim durability when it depends on an unverified platform seam.

### Phase 7 — Consolidate

Remove retired components, flags, compatibility authorities, stale schemas, and duplicated documentation only after rollback and retention windows close. Complete a product-wide responsive, accessibility, disclosure, security, and operational audit.

### Immediate next actions

1. Approve Phase 0 as the next work package.
2. Create the route/domain/authority inventory without modifying behavior.
3. Reconcile `DESIGN.md`, `globals.css`, Miro reference, Chill Subs capture, and existing opportunity fixture into a design-system decision draft.
4. Produce the Opportunities disclosure schema and state matrix.
5. Establish current visual/accessibility/performance baselines at required breakpoints.
6. Inventory workspace scripts and draft—not yet enable—the Turborepo task graph.
7. Define the first rollout flag contract and expiry policy without connecting a provider yet.
8. Verify live ingestion-v2 transport, Workflow usage, outbox dispatch, and production connection budgets through their operational authorities.

## Risk and Decision Register

### Highest-priority risks

| Risk | Consequence | Required control |
|---|---|---|
| Treating overhaul as styling | old authority and workflow defects survive | vertical journey scope and domain contract gate |
| Framework rewrite | delays, duplicated defects, broad regression | retain Next/React; isolated measured experiments only |
| Miro copied as theme | Missa identity and state semantics drift | canonical design review and semantic-token enforcement |
| Old/new logic diverges | inconsistent writes and permissions | shared repositories/contracts; flags at presentation boundary |
| Public cache leaks personalization | privacy and authorization incident | explicit cache classification and automated response tests |
| Async UI overstates outcome | users trust work that was only queued | receipt/status vocabulary and reconciliation |
| Dual storage authorities | silent state divergence | single-writer cutover and fail-closed selectors |
| Duplicate worker/provider effects | repeated emails, events, or actions | stable idempotency, unique constraints, receipts, recovery tests |
| Flags persist indefinitely | permanent branching and test burden | owner, expiry, removal automation, coexistence limit |
| DeepSec treated as certification | false security confidence | revalidation and conventional secure-development controls |

### Mandatory decision gates

- **Svelte:** closed unless a bounded experiment demonstrates a measured unmet requirement.
- **SWR resource:** requires explicit freshness, key, owner, invalidation, error, and test contracts.
- **New flag:** requires fallback, cohort, signal, owner, expiry, and removal task.
- **Workflow adoption:** requires waits/retries/recovery need, idempotency, payload/data policy, cost, and operator recovery.
- **New service:** requires independent scale/deploy/failure evidence that package/worker separation cannot satisfy.
- **DeepSec initialization:** requires source-sharing, provider/model, Vercel-project, cost/duration, ignored paths, and triage approval.
- **Compatibility retirement:** requires reconciled data, verified readers/writers, rollback-window closure, and production evidence.

## Success Measures

### User and product outcomes

- users can understand opportunity eligibility, fee, deadline, location, organization confirmation, source, and unknowns without opening multiple disconnected surfaces;
- discovery-to-detail, detail-to-save, and save-to-tracker completion improve;
- support issues caused by ambiguous state, missing disclosure, navigation, or lost progress decline;
- creator and organization tasks recover correctly after refresh, reconnect, worker retry, or provider ambiguity.

### Interface-system outcomes

- primitive and disclosure-pattern duplication falls measurably;
- no new raw color/spacing/control implementations outside sanctioned foundations;
- required breakpoints show no horizontal overflow;
- serious/critical automated accessibility violations remain zero, supplemented by manual assessment;
- deprecated components and flags have bounded age and visible removal ownership.

### Performance and reliability outcomes

- p75 LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 by route/device where field volume permits;
- route JavaScript, hydration, query count, server timing, cache behavior, and connection use remain within slice budgets;
- worker claim age, retry rate, reconciliation lag, stale heartbeats, and unknown outcomes are observable and bounded;
- canary rollback can occur without data repair because old/new interfaces share durable contracts.

### Architecture and security outcomes

- product routes use canonical domain contracts and disclosure-safe view models;
- authoritative compatibility stores retire only with reconciliation evidence;
- external effects have idempotency/replay coverage;
- all privileged routes and webhooks have authorization/signature/replay tests;
- security findings are validated, owned, remediated, and never represented as certification merely because a scanner completed.

## Future Technical Outlook

Near term, Missa should invest in consistency and verified durability rather than framework novelty. Next.js Cache Components, SWR, Workflow, and managed flags should be adopted only through bounded pilots with explicit value and rollback.

Medium term, validated domain contracts and a framework-neutral token/disclosure model create optionality: a native client, partner API, alternate renderer, or isolated Svelte experiment could reuse the product model without forcing the current overhaul to finance that optionality upfront.

Long term, Missa can differentiate through evidence-aware opportunity intelligence and durable application control. That requires stronger versioned disclosure, reconciliation, user-controlled automation, and explainable projections—not a proliferation of services or client frameworks.

## Research Methodology, Sources, and Limitations

### Methodology

The research combined:

- current repository and source-file inspection;
- supplied design-reference analysis with instructions treated as untrusted reference content;
- direct browser study of Chill Subs list, filter, detail, and atomic disclosure flows;
- current official documentation for Next.js, React, SvelteKit, SWR, Turborepo, Vercel Flags, Workflow, DeepSec, Neon, Redis, Playwright, W3C/WCAG, web.dev, OpenTelemetry, AWS, Microsoft Azure Architecture Center, and Google SRE;
- explicit separation of verified repository facts, historical/project memory, external pattern guidance, recommendations, and unresolved operational questions.

### Source hierarchy

1. Missa's durable database, live worker/service state, and exact deployed routes for current operational claims.
2. Current repository code and canonical project documentation for implementation facts.
3. Official vendor/standards documentation for technology behavior.
4. Supplied Miro/Chill Subs materials for design and comparative pattern evidence.
5. Recommendations and inferences, labeled with confidence and gates.

### Limitations

- Repository inspection cannot certify current production health, queue depth, worker liveness, costs, connection budgets, or exact deployed versions.
- The active ingestion-v2 Postgres-claim versus BullMQ path requires live verification.
- The existence of `outbox_events` does not prove an active dispatcher.
- Workflow 4 is declared but its current production use remains unverified.
- Vercel Flags service status, SLA, and pricing should be reconfirmed before it becomes critical infrastructure.
- DeepSec was only planned in read-only mode; no security baseline was executed.
- Numeric schedule and staffing estimates require the Phase 0 inventory and ownership review.
- Automated accessibility and visual checks cannot replace manual and inclusive testing.

### Confidence

- **High:** retain Next/React; use modular-monolith/worker architecture; evolve the existing design system; migrate by vertical journey; keep Postgres authoritative.
- **High:** do not combine UI overhaul, framework migration, Workflow major-version migration, and security-platform onboarding.
- **Medium:** exact SWR resources, cache tags, package boundaries, and Workflow candidates until Phase 0 completes.
- **Unresolved operationally:** active ingestion-v2 transport, outbox dispatch, current Workflow usage, queue/claim health, and production resource budgets.

## Technical Research Conclusion

Missa should overhaul the entire product, but durability comes from disciplined boundaries rather than replacement for its own sake. The correct path preserves the proven platform, repairs authority and disclosure contracts, creates a real design system, and replaces complete journeys through measured, reversible releases.

Begin with Phase 0, then make Opportunities the first complete proof. Once that slice demonstrates truthful disclosure, accessible interaction, canonical data, reliable mutation, observable background work, safe rollout, and clean retirement, the same method can carry the rest of Missa without another foundational rewrite.

**Technical Research Completion Date:** 2026-08-31

**Source Verification:** Current official documentation plus repository evidence

**Technical Confidence:** High for strategic direction; operational gates explicitly unresolved where live verification is required
