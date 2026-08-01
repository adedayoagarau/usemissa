---
title: Opportunities Backend Requirements
product: Missa Passport
status: Living build companion
date: 2026-07-31
design_scope: opportunities-product-design-scope.md
owners:
  schema: packages/db
  contracts: packages/contracts
  domain: packages/radar-engine
  application: apps/web
---

# Opportunities Backend Requirements

## 1. Purpose

This is the living backend companion to the Opportunities product-design scope. It records what each visible interaction needs from contracts, persistence, queries, mutations, ingestion, security, analytics, and tests.

Update this document in the same change as every Opportunities UI slice. A screen is not complete when it works only against hand-written component data or an undocumented compatibility API.

## 2. Dependency decision

### Required npm dependencies already installed

| Need | Existing dependency | Decision |
| --- | --- | --- |
| App and server rendering | Next 16, React 19 | Use existing |
| Styling and responsive layout | Tailwind CSS 4 | Use existing |
| Accessible UI primitives | shadcn, Base UI | Use existing |
| Forms | React Hook Form, Hookform resolvers | Use existing |
| Runtime contracts | Zod through `@missa/contracts` | Use existing |
| Dates and relative deadline labels | date-fns | Use existing |
| Icons | Lucide React | Use existing |
| Toast feedback | Sonner | Use existing |
| Class composition | CVA, clsx, tailwind-merge | Use existing |
| Error monitoring | Sentry for Next.js | Use existing |
| Workflow/background execution | Workflow | Use existing when asynchronous work is required |
| End-to-end and accessibility testing | Playwright, axe-core/playwright | Use existing |
| Database and migrations | Drizzle ORM, Drizzle Kit, pg | Use existing through `@missa/db` |

### No immediate dependency additions

The first Opportunities slice does not require TanStack Query, a global state library, a separate search service, a virtualization library, or a new animation package.

- Use server-rendered public results and URL search parameters for browse state.
- Use server actions or small route handlers for mutations.
- Use keyset pagination rather than rendering the entire corpus.
- Use PostgreSQL search and indexes before adding an external search service.
- Use CSS transitions and existing motion tokens for ordinary interactions.

### Required internal package wiring

The production repository implementation should add `@missa/db` as a workspace dependency of `@missa/radar-adapters`. `apps/web` should consume a server-only Opportunity repository exported by the adapter layer rather than importing `pg` or creating a second schema authority.

Target ownership:

- `@missa/radar-engine` — domain types, ranking rules, and repository ports; remains infrastructure-independent.
- `@missa/contracts` — versioned request and response validation.
- `@missa/db` — authoritative Drizzle schema and migrations.
- `@missa/radar-adapters` — PostgreSQL Opportunity query/write repository backed by `@missa/db`.
- `@missa/web` — route/page orchestration and presentation.

When that wiring is added, align the currently different `pg` versions in `@missa/db` and `@missa/radar-adapters` instead of maintaining two independently pinned database clients.

### Conditional additions

Add a dependency only when the selected implementation proves it is necessary:

| Candidate | Add only if | Default |
| --- | --- | --- |
| `motion` | A selected Interior-style component requires layout choreography that CSS cannot express accessibly | Do not add yet |
| `nuqs` | Native typed URL-state helpers become repetitive or error-prone across browse controls | Start with shared internal parsers |
| PostgreSQL `pg_trgm` extension | Prefix/fuzzy search quality cannot meet the agreed contract with full-text search alone | Benchmark first |
| Dedicated search service | Corpus scale, ranking, or latency exceeds measured PostgreSQL budgets | Post-1.0 evaluation |
| Image processing/storage addition | Source identity assets cannot be safely served through current Next image handling and Vercel Blob | Define asset policy first |

Interior components are references, not a blanket package-install decision. Copy only selected behavior, retain Missa tokens and shadcn semantics, and document any transitive dependency before adding it.

## 3. Current backend reality

### First gate now implemented

The browse/detail contract and persistence seam are now present:

- `@missa/contracts` exports bounded browse/detail query and response schemas.
- `@missa/radar-engine` exports the `OpportunityRepository` port and projections.
- `@missa/db` contains the additive relational Opportunities schema and generated migrations (`0001_steady_lockheed.sql`, `0002_spooky_molecule_man.sql`). Both migrations were applied transactionally to the production Neon database on 2026-08-01 and verified by table, constraint, index, and live repository queries.
- The production Neon database predates the Drizzle ledger and contains a partial legacy baseline. The `0000_wet_dracula.sql` baseline was deliberately not replayed because it would conflict with existing compatibility tables. Do not run the full `db:migrate` command against production until that baseline is reconciled and a ledger cutover is rehearsed.
- `@missa/radar-adapters` implements parameterized PostgreSQL browse/detail queries with publication filtering, keyset cursors, source evidence, and private tracked/following augmentation.
- `apps/web` exposes `GET /api/opportunities` and `GET /api/opportunities/:id`. Set `MISSA_OPPORTUNITY_REPOSITORY=postgres` with `DATABASE_URL` to opt into PostgreSQL; otherwise the engine-backed compatibility repository remains available during cutover.

The public API validates its output at the route boundary, so internal ordering fields such as `createdAt` are never part of the browse response.

### Already available

- Radar opportunity discovery, extraction, validation, deduplication, freshness, trust signals, changes, status derivation, and submission URLs.
- `RadarProfile` and `MatchCriteria` for types, genres, keywords, fee, verified-only, deadline window, location, and simultaneous submissions.
- Track and Follow domain behavior.
- Authenticated user routes for discover, profiles, track, tracker, follow, and unfollow.
- Session-cookie verification and self-access checks.
- `@missa/contracts` as the validation package.
- `@missa/db` as the authoritative Drizzle schema and migration package.
- Audit and outbox tables for durable events.

### Not production-ready for this page

- `/opportunities` is authenticated only and loads the complete in-process Opportunity store.
- Filtering, sorting, and pagination happen in memory.
- `/api/users/:id/discover` returns one unpaginated list.
- Public browse and canonical detail routes do not exist.
- Browse and detail use a small duplicated `opportunityView()` projection rather than shared versioned contracts.
- The authoritative Drizzle schema has no queryable relational Opportunity, Source, saved-search, follow, or tracked-opportunity tables.
- Radar persistence remains a compatibility snapshot boundary rather than the target concurrent query/write model.
- Discipline, career stage, deadline timezone, publication state, field provenance, and asset rights are not fully modeled.
- Submission-destination safety is validated during extraction but not revalidated through a controlled outbound handoff.
- Tailoring reasons are available only through broad engine matching/Fit concepts; the page needs a separate factual `matched preference` explanation.

## 4. Required service boundaries

### Opportunity query service

Create one authoritative server-side query boundary supporting:

- public publication state;
- text query;
- type;
- discipline;
- genre;
- location;
- fee range and no-fee-only;
- prize/funding presence when reliable;
- deadline window and deadline kind;
- verified-only;
- open-now;
- simultaneous-submission policy;
- category shortcut;
- `Recommended`, soonest deadline, recently verified, and recently added sort;
- keyset cursor and limit;
- optional authenticated preference, tracked, and following augmentation.

The web page must not import the store and filter it directly.

### Opportunity detail service

Resolve an immutable opportunity ID and optional slug to:

- canonical public facts;
- organization identity;
- eligibility;
- required materials;
- deadline date, kind, timezone, and change history;
- fee and compensation;
- official guidelines and submission destinations;
- provenance and freshness evidence;
- other open opportunities from the organization;
- private tracked/following state only when authenticated.

### Tailoring service

Tailoring answers `why was this opportunity surfaced?`, not `does this manuscript fit?`.

Inputs are explicit, user-controlled opportunity preferences, saved searches, and followed organizations. Output is a ranked list plus factual reasons such as:

- `Matches your Poetry preference`;
- `Matches your No fee preference`;
- `From an organization you follow`;
- `Matches your Europe residency search`.

The service must never infer protected attributes or manuscript quality. Work comparison remains a separate later boundary.

### Outbound submission service

Use a controlled server endpoint such as `/out/opportunities/:id/submission` instead of rendering an unchecked stored URL directly.

At click time it must:

1. Resolve the canonical published opportunity.
2. Confirm it is not closed, suppressed, withdrawn, or duplicate.
3. Resolve the current validated submission URL.
4. Allow only `https` and approved safety rules.
5. Compare the destination host with the last verified host.
6. Record a privacy-safe outbound event without delaying navigation.
7. Redirect with a short-lived, non-cacheable response.
8. Return a truthful unavailable or changed-destination state instead of guessing.

Opening the destination never creates a Tracker item and never changes personal status to Submitted.

## 5. Contract package requirements

Define versioned Zod schemas in `@missa/contracts`:

- `OpportunityBrowseQuery`
- `OpportunityBrowseItem`
- `OpportunityBrowseResponse`
- `OpportunityDetailResponse`
- `OpportunityTailoringReason`
- `OpportunityPersonalState`
- `OpportunityPreferenceInput`
- `SavedSearchInput`
- `TrackOpportunityInput`
- `UpdateTrackedStatusInput`
- `FollowOrganizationInput`
- `OpportunityIssueReportInput`
- `OutboundDestinationState`

Contracts must represent unknowns explicitly. `undefined`, `unknown`, `not disclosed`, and a confirmed zero fee are different states.

Public contracts must not contain raw confidence/trust numbers, internal suspicious signals, private preference values unrelated to the displayed reason, raw source snapshots, or adapter details.

## 6. Authoritative persistence model

All production schema and migrations belong in `@missa/db`.

### Public opportunity data

- `opportunity_sources`
- `opportunities`
- `opportunity_versions`
- `opportunity_changes`
- `opportunity_eligibility_rules`
- `opportunity_required_materials`
- `opportunity_source_evidence`
- `opportunity_slug_aliases`
- `opportunity_identity_assets`

The exact degree of normalization may change after query benchmarks, but deadline, type, publication state, verification evidence, fee, location, and search text must be queryable and indexed columns rather than opaque JSON-only fields.

### Personal opportunity data

- `opportunity_preferences`
- `saved_searches`
- `tracked_opportunities`
- `tracked_status_events`
- `organization_follows`
- `submission_outbound_events`
- `opportunity_issue_reports`

Required uniqueness examples:

- one tracked row per account/user and opportunity;
- one follow per account/user and organization;
- stable saved-search ownership and name rules;
- one idempotency key per mutation attempt where retries are possible.

### Index requirements

At minimum benchmark indexes for:

- publication state plus status plus deadline;
- type plus deadline;
- genre/discipline membership;
- no-fee and fee range;
- verified evidence plus freshness expiration;
- organization plus publication state;
- normalized location;
- created/verified timestamps;
- public search document;
- tracked user plus status/deadline;
- saved-search owner;
- follow owner.

## 7. Data-model gaps to resolve

| Gap | Why the page needs it | Initial decision |
| --- | --- | --- |
| Publication state | Prevent draft, unsafe, duplicate, or withdrawn records from public browse | Add independently from Radar lifecycle status |
| Discipline | Top-level preference/filter separate from genre | Add canonical vocabulary |
| Career stage | Tailoring and eligibility display | Add typed values; do not hide in keywords |
| Deadline timezone/time | Honest `Today` and cutoff behavior | Store timezone/time when published; preserve date-only unknown |
| Field provenance | Explain which facts are official, confirmed, or inferred | Store per-field evidence |
| Verification evidence | Power `Verified` without exposing a raw trust score | Define an evidence predicate and expiration |
| Submission host verification | Safe one-click outbound link | Store verified host and verification timestamp |
| Compensation model | Filter/display prize, grant, stipend, or pay consistently | Add amount/range/currency/kind where extractable |
| Identity assets | Recognizable cards without broken placeholders | Store source, rights, dimensions, and fallback data |
| Preference reason | Explain tailoring without manuscript Fit | Persist/derive a public-safe reason code and label |

## 8. API target

Prefer session-derived `/api/me/*` routes for personal state instead of accepting a user ID from the browser.

### Public

- `GET /api/opportunities`
- `GET /api/opportunities/:id`
- `GET /out/opportunities/:id/submission`
- `GET /out/opportunities/:id/guidelines`

### Authenticated personal state

- `GET /api/me/opportunity-preferences`
- `PUT /api/me/opportunity-preferences`
- `GET /api/me/saved-searches`
- `POST /api/me/saved-searches`
- `PATCH /api/me/saved-searches/:id`
- `DELETE /api/me/saved-searches/:id`
- `POST /api/me/tracked-opportunities`
- `PATCH /api/me/tracked-opportunities/:opportunityId`
- `DELETE /api/me/tracked-opportunities/:opportunityId`
- `POST /api/me/followed-organizations`
- `DELETE /api/me/followed-organizations/:organizationId`
- `POST /api/me/opportunity-issue-reports`

Existing `/api/users/:id/*` routes remain compatibility surfaces until callers migrate. Do not introduce a second permanent behavior contract.

## 9. Cache and rendering boundaries

- Public browse/detail facts may be server rendered and cached by a stable public query key.
- Personalized ranking, tailoring reasons, Track, and Follow state are private and must not enter shared caches or public metadata.
- Either compose public and private data server-side with private caching rules or load a small authenticated augmentation separately.
- Cache invalidation must react to publication changes, material fact changes, verification expiry, and emergency suppression.
- A crawler receives only the public projection.

## 10. Ingestion and freshness dependencies

The page depends on Radar producing honest public facts:

- fetch attempt, successful fetch, and successful processing remain separate timestamps;
- failed extraction does not advance `details checked` freshness;
- deadline, fee, eligibility, requirements, guidelines URL, and submission URL changes create attributable change records;
- conflicting deadlines cannot appear as a confident closing date;
- destination-host changes trigger review or a user warning;
- emergency suppression bypasses normal ingestion cadence;
- closed/withdrawn records disappear from default browse without erasing safe history.

## 11. Mutation behavior

Track, Follow, preference updates, and Save Search must be:

- authenticated from the session;
- ownership scoped;
- Zod validated;
- idempotent;
- transactional;
- protected against duplicate concurrent writes;
- auditable when state affects reminders, digests, or status history;
- paired with an outbox event when downstream delivery depends on the mutation.

Do not persist one personal mutation by replacing an entire Radar snapshot.

## 12. Observability and analytics

Record operational metrics separately from product analytics.

### Operational

- browse query duration and result count;
- query errors and timeouts;
- cache hit/miss;
- detail-not-found and canonical redirects;
- stale verification count;
- missing or blocked submission destinations;
- outbound redirect failures and host-change warnings;
- mutation conflict, duplicate, and retry rates;
- ingestion-to-publication delay.

### Product-safe

- category, search, filter, and sort usage;
- tailoring explanation opened;
- preferences updated;
- quick detail and full detail opened;
- Track and Follow actions;
- official guideline and submission outbound events;
- return check-in response;
- zero-result recovery.

Do not store manuscript content, protected attributes, raw personal search text beyond the approved retention period, or later Work-comparison reasons in generic analytics.

## 13. Security and privacy

- Validate and normalize every query parameter.
- Derive personal identity from the session, not a request body or route user ID.
- Separate public and private DTOs and cache policies.
- Sanitize source-derived content.
- Block non-HTTP(S) and known-unsafe destinations.
- Protect mutations with origin/CSRF policy and idempotency keys.
- Rate-limit search abuse, saved-search writes, follows, Track, and issue reports appropriately.
- Keep raw snapshots and moderation signals out of public responses.
- Audit emergency suppression and organization overrides.
- Never infer protected eligibility attributes from browsing behavior.

## 14. Test dependencies

### Contract and unit tests

- valid and invalid browse queries;
- explicit unknown fee/deadline states;
- stable deadline labels at timezone boundaries;
- tailoring reason generation from explicit preferences;
- no manuscript Fit in default projections;
- destination validation and changed-host handling;
- cursor stability and deterministic sort tie-breaking.

### Database and integration tests

- representative filter and sort combinations;
- keyset pagination without duplicates or gaps;
- query plans for common and worst-case filters;
- concurrent Track, Follow, and Save Search writes;
- public/private cache isolation;
- expand/backfill verification against compatibility data;
- suppression and verification-expiry invalidation.

### End-to-end tests

- signed-out `All` browse;
- signed-in `For you` with visible factual reasons;
- preference setup/edit/clear;
- search, filters, sort, and URL restoration;
- quick detail, Back, focus, and scroll restoration;
- one-click official submission redirect;
- missing/changed/unsafe destination;
- Track, Follow, and Save Search authentication continuation;
- return check-in without automatic Submitted state;
- mobile filter sheet and sticky action;
- keyboard and screen-reader primary journey.

## 15. Performance budgets

- Public LCP at or below 2.5 seconds at p75.
- CLS below 0.1.
- Search/filter response begins within 100ms and settles within 500ms for a warm common query.
- Initial response contains only the first result page and required card fields.
- Personalized augmentation is batched; never one database query per card.
- Browse query, server render, transfer, and hydration are measured separately.

## 16. Migration and cutover

The compatibility Radar store remains readable while the new query model is introduced.

1. Expand `@missa/db` with new tables, constraints, and indexes.
2. Backfill a disposable database from compatibility records.
3. Verify counts, canonical IDs, URLs, deadlines, statuses, preferences, tracked items, and follows.
4. Add repository reads and compare them against current engine output in shadow mode.
5. Move personal writes to relational transactions and dual-read/verify where needed.
6. Cut public browse/detail to the query service.
7. Cut personal reads to the relational model.
8. Retain a documented rollback path.
9. Contract compatibility authority only after reconciliation proves safe.

Never apply the baseline or cutover migrations to live data without rehearsal on a disposable copy.

## 17. Build documentation ledger

Every implementation slice adds or updates a row here.

| UI slice | Contract | Query/mutation | Persistence | Security/privacy | Analytics | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Browse shell and cards | Browse query/item/response | Public paginated query | Opportunity projection + indexes | Public DTO only | view/category/sort | contract, query, E2E | Planned |
| Tailored `For you` | Tailoring reason/personal state | Preference-ranked query | Preferences and saved searches | private no-store augmentation | explanation/preferences | isolation and ranking | Planned |
| Search and filters | Browse query | Server-side filter parser | search document + filter indexes | sanitize/rate-limit | search/filter/zero | parsing/query/E2E | Planned |
| Quick detail | Detail response | Public detail query | versions/evidence/changes | public projection | quick-detail opened | canonical/focus/E2E | Planned |
| Go to submission | Destination state | controlled redirect | verified destination evidence + event | allow-list/host change | outbound/error | safety/redirect/E2E | Planned |
| Track | Track input/personal state | idempotent personal mutation | tracked + status event | session owner/CSRF | tracked | concurrency/E2E | Planned |
| Save search | Saved-search input | CRUD | saved searches | session owner/limits | create/edit/delete | validation/concurrency | Planned |
| Follow organization | Follow input | idempotent personal mutation | follows | session owner/CSRF | followed | concurrency/E2E | Planned |
| Return check-in | Status update input | explicit status mutation | tracked status event | session owner | response/status | no-auto-submit/E2E | Planned |
| Report issue | Report input | moderated write | issue reports + audit | rate limit/privacy | reported | abuse/retry/E2E | Planned |

## 18. First implementation gate

Do not begin the polished result grid against the current whole-store page as if it were the production boundary.

The first implementation gate is complete when:

1. Browse and detail contracts exist in `@missa/contracts`.
2. URL query parsing and deadline/fee presentation helpers are tested.
3. A repository interface can return deterministic paginated Opportunity browse results.
4. Tailoring reasons are defined separately from manuscript Fit.
5. The controlled official-submission redirect contract is defined.
6. The relational schema/cutover plan is reviewed before migration generation.

The UI may then be built against the contracts with realistic fixtures while the relational repository is implemented behind the same boundary.
