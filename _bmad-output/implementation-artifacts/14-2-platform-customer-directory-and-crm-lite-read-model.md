# Story 14.2: Platform customer directory and CRM-lite read model

Status: done

## Story

As a Missa platform operator, I want to find organizations, accounts,
memberships, plan state, and current activity in one customer directory, so
that I can support customers and understand adoption without querying stores
manually.

## Scope

Build a platform-admin-only read model and `/admin/customers` surface from the
current RadarEngine and WorkspaceEngine runtime stores. Keep the first version
read-only. Do not invent CRM persistence or expose credential/private-content
fields.

## Current implementation context

- Auth boundary: `apps/web/lib/platformAdmin.ts` and
  `apps/web/lib/platformAdminAuth.ts`; only an active signed account with
  `account.isAdmin` can access the platform plane.
- Runtime sources: `apps/web/lib/engine.ts` and
  `apps/web/lib/workspaceEngine.ts`; read the stores through the existing
  process-safe bridges.
- Radar identity: `RadarStore.organizations`, `accounts`, and `memberships`.
- Workspace activity: entities → programs → open calls → submission paths →
  submissions → decisions/delivery tasks.
- Billing fields are optional on `Organization`; missing values must be shown as
  unknown/not configured, never inferred as free or active.
- Never return `Account.passwordHash`, session tokens, OAuth/provider
  credentials, raw answers, file URLs, message bodies, or audit detail payloads.

## Acceptance criteria

1. `/admin/customers` is protected by the existing platform-admin page boundary.
2. The read model includes organization id/name/verification, member count,
   distinct account count, open-call count, submission count, decision count,
   delivery count, billing tier/status as observed, and latest observed activity.
3. Search/filtering can narrow by organization name, billing state, and activity
   state without a page-level horizontal overflow on mobile.
4. Every response/page includes maturity, source, freshness, and warnings.
5. Empty/unavailable compatibility stores are explicit unavailable/empty states.
6. CRM-only fields are labelled planned: notes, contacts, segments, tasks,
   interaction timelines, health snapshots, and merge/dedupe controls.
7. Add focused read-model and route/auth tests; existing admin/build/lint tests
   remain green.

## Implementation notes

- Prefer one `PlatformAdminCustomersData` contract in
  `apps/web/lib/platformAdmin.ts` and reuse `AdminArea`/`ProvenanceNote`.
- Build deterministic rows; sort active/attention organizations before quiet
  rows and cap table rendering if needed.
- Use a client table only for local filter state; do not create a second data
  fetch path or duplicate authorization.
- Keep this story read-only. Mutations belong to later governed CRM stories and
  require additive `@missa/db` migrations plus audit/idempotency contracts.

## Test plan

- Unit: organization counts, distinct memberships, billing unknown state,
  latest activity, private-field exclusion, unavailable store behavior.
- Route: 401/403/200 and `cache-control: private, no-store`.
- UI/E2E: desktop and 390px mobile; filter behavior; no page overflow.

## Implementation and validation

- Added `PlatformAdminCustomersData` to the shared platform read model and
  connected `/admin/customers` plus `GET /api/admin/customers` to the existing
  Radar/Workspace compatibility stores.
- The directory joins organizations, memberships, account counts, Workspace
  activity, billing fields, delivery attention, and latest observed activity
  without serializing password hashes or private content.
- Added search, billing-state, and activity-state filters plus explicit planned
  CRM fields for notes, contacts, segments, tasks, timelines, health snapshots,
  and dedupe controls.
- Focused read-model/auth tests cover private-field exclusion, empty versus
  unavailable state, unknown billing, and protected API access.
