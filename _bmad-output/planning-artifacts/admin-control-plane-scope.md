---
title: Missa Admin Control Plane scope
type: architecture-and-product-scope
created: 2026-08-05
status: active
---

# Missa Admin Control Plane

## Decision

Missa needs two related admin planes with different permissions and different
questions. They should share visual primitives and read-model conventions, but
they should not be collapsed into one dashboard.

### Platform Admin

The Missa operator asks:

- What needs attention right now?
- Which organizations/accounts are active, blocked, or unhealthy?
- What content is canonical Radar data versus customer-owned Workspace data?
- Is the product funnel moving from open calls to submissions to decisions to delivery?
- Is Radar fresh, and is worker liveness actually observed?
- What is the state of billing, security, integrations, audit, support, and agents?

Initial routes:

| Route | Purpose | Current source of truth |
| --- | --- | --- |
| `/admin` | Control Room: attention, KPI summary, quick links | RadarStore, WorkspaceStore, durable worker probes |
| `/admin/customers` | Customer directory / CRM-lite read model | organizations, accounts, memberships, Workspace activity |
| `/admin/content` | Radar + Workspace content registry | opportunities, claims, open calls, source health |
| `/admin/analytics` | Platform funnel and health metrics | derived from current runtime stores |
| `/admin/operations` | Actionable operational queues | compatibility queues and optional durable tables |
| `/admin/radar` | Source, lifecycle, quality, and claim detail | RadarStore |
| `/admin/agents` | Worker graph, runs, handoffs, review/enrichment jobs | durable agent tables when deployed |
| `/admin/system` | Runtime/config/readiness | runtime probes |
| `/admin/audit` | Append-only action history | Radar/Workspace audit plus optional audit table |
| `/admin/taxonomy` | Policy and taxonomy governance | taxonomy stores |

### Organization Admin

The customer team asks:

- What opportunities and open calls are live?
- Which submissions need triage, review, decision, or delivery?
- Who is working on each stage?
- What should be sent to applicants and what is the delivery status?
- What did the program do, and what can be exported?
- Who has access and what should the organization settings be?

Approved navigation from `docs/missa-naming-decisions.md`:

`Opportunities · Submissions · Reviews · Decisions · Messages · Delivery · Insights · People · Settings`

People is the product-facing name for CRM-lite. It must not become a second
identity system: account identity and organization membership remain owned by
the existing auth/access boundary.

## What is buildable from the current backend

The first implementation tranche is intentionally connected to existing
runtime stores:

- customer counts and customer directory rows from organizations, accounts,
  memberships, billing fields, and observed Workspace activity;
- content registry rows from canonical Radar opportunities, claims, source
  freshness, and organization open calls;
- product funnel metrics from open calls, submissions, decisions, accepted
  outcomes, delivery tasks, and Radar source health;
- operational attention from the existing queue/read model and optional
  durable worker tables.

These are read models, not new claims of durable CRM/CMS/event infrastructure.
Every section must show maturity, source, and freshness. Compatibility stores
remain labelled as such.

## What is not present yet

The repo has no durable models for:

- People records beyond accounts and memberships;
- CRM notes, interactions, tasks, segments, consent, duplicate merging, or
  customer health snapshots;
- CMS drafts, media assets, editorial revisions, approvals, scheduled
  publishing, or public content collections;
- message threads, template versions, inbound replies, delivery analytics, or
  communication preferences;
- product events/facts, cohorts, retention, attribution, experiment metrics,
  revenue-recognition facts, or scheduled reports;
- support tickets/incidents, feature flags, API-key registry, contracts, or
  signatures.

Those capabilities need additive `@missa/db` migrations, explicit ownership,
retention/privacy rules, idempotency, and audit contracts before their UI is
presented as fully operational. A disabled or planned state is more truthful
than a fake CRUD panel.

## Metric contract

Every admin metric has these fields conceptually, even when rendered compactly:

1. **Name** — what the operator sees.
2. **Grain** — account, organization, open call, submission, work, decision,
   delivery task, opportunity, source, or worker lane.
3. **Calculation** — numerator, denominator, filter, and time window.
4. **Source** — compatibility store, durable table, or derived read model.
5. **Freshness** — when it was read or when the source last changed.
6. **Maturity** — live, durable, derived, partial, target schema, or unavailable.
7. **Privacy boundary** — whether private content is excluded.

Important distinctions must survive the redesign:

- worker liveness is not productive throughput;
- successful fetch is not processed content;
- a Radar opportunity is not an organization open call;
- submission count is not decision count;
- accepted Work is not completed delivery;
- current runtime-derived analytics are not a product event warehouse.

## Delivery sequence

1. Ship the responsive Platform Admin shell and connected Control Room.
2. Add customer directory, content registry, and derived analytics read models.
3. Give Organization Admin its own scoped shell over the existing connected
   workflows.
4. Add durable People/CRM, messages, CMS, analytics facts, support, billing,
   and automation models one domain at a time.
5. Only then add mutations that change customer state, content publication, or
   agent execution, with audit and idempotency gates.

## Design constraints

- true white canvas; no dark console or card-soup dashboard;
- Instrument Sans UI, Fragment Mono data, Fraunces for display headings;
- table-first dense surfaces with filters and sheets/drawers for detail;
- mobile navigation collapses; tables scroll inside their own region;
- show a small number of meaningful attention/KPI blocks above the fold;
- use plain labels: Customers, Content, Analytics, Operations, Agents;
- avoid “healthy” when the system has no explicit observation proving health.
