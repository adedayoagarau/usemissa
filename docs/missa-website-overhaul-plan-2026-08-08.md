---
title: Missa website overhaul plan
version: "2.0-draft"
status: planning
created: "2026-08-08"
scope: Public website, Profile, Organization, reviewer, and platform admin
supersedes_for_new_design_work: _bmad-output/planning-artifacts/ux-design-specification.md
component_selection_status: approved-local-system-page-promotion-gated
tracker_contract_status: approved-implemented-locally-not-deployed
opportunity_detail_status: option-02-approved-implemented-locally-not-deployed
library_work_status: selected-local-composition-product-promotion-blocked
inbox_status: selected-local-composition-product-promotion-blocked
calendar_status: selected-local-composition-product-promotion-blocked
profile_status: selected-local-composition-product-promotion-blocked
organization_chooser_overview_status: option-01-selected-local-composition-product-promotion-blocked
organization_opportunities_builder_status: option-01-selected-local-composition-product-promotion-blocked
organization_submission_review_decision_status: selected-local-responsive-family-product-promotion-blocked
organization_messages_delivery_status: option-02-read-only-local-routes-mutations-and-production-blocked
organization_insights_status: option-02-read-only-local-route-production-blocked
organization_people_permissions_status: option-02-read-only-local-route-mutations-and-production-blocked
organization_settings_billing_status: option-02-read-only-local-route-mutations-and-production-blocked
public_organization_profile_status: option-02-applied-existing-local-route-deployment-blocked
hosted_application_status: option-02-applied-existing-local-route-complete-contract-and-deployment-blocked
organization_product_family_status: local-regression-passed-27-tests-production-blocked
reviewer_status: option-02-bounded-local-product-routes-3-tests-production-blocked
platform_admin_status: option-02-applied-local-admin-family-regression-passed-production-blocked
whole_site_coverage_status: 55-product-routes-audited-gaps-recorded
shared_shells_status: option-02-selected-local-composition-product-promotion-blocked
public_acquisition_status: opportunities-first-tranche-implemented-locally-other-surfaces-gated
auth_onboarding_status: journey-aware-selection-local-composition-product-promotion-blocked
creator_utilities_status: option-02-selected-local-composition-product-promotion-blocked
current_route_contract_coverage: 55-of-55
---

# Missa website overhaul plan

## 1. Purpose

This document defines the product and UX architecture for a major Missa overhaul before any premium component is selected or promoted.

Implementation note: Option 2 has since been explicitly approved and implemented locally for canonical Opportunities browse/detail, customer-safe media/evidence, and Save-to-Tracker authentication return. This does not authorize or imply promotion of the remaining page families, and no production deployment is claimed.

Tracker implementation note: the selected Next Actions synthesis, mobile-safe Stage Board, URL-backed Tracker views, self-scoped status/Work mutations, hosted Submissions view, and canonical per-Work receipt detail are now implemented locally. Former My submissions routes are compatibility redirects. Deeper status-store reconciliation and Work-scoped acceptance orchestration remain explicit domain gaps.

Organization post-decision implementation note: Option 2, Outcome desk, now supplies local read-only `/organization/[id]/messages` and `/organization/[id]/delivery` routes. Messages is limited to durable batch and recorded-recipient facts; Delivery starts only from accepted per-Work Decisions and names the compatibility task boundary. No send, retry, completion, API, schema, or production promotion is authorized.

Organization Insights implementation note: Option 2, Program lens, now supplies a local read-only `/organization/[id]/insights` route. Its tested projection corrects the compatibility report's grain and median errors, keeps all twelve taxonomy facets non-additive, shows missing-data reasons, and withholds date comparison until timezone exists. No export, analytics instrumentation, demographic analysis, schema change, or production promotion is authorized.

Organization People implementation note: Option 2, Access dossier, now supplies a local read-only `/organization/[id]/people` route. It separates membership, Organization-wide role, compatibility seat, current route visibility, assignments, account/provisioning hints, and sole-Owner safeguards. Unsafe instant invite, role, removal, transfer, and seat controls remain withheld; no API, schema, or production promotion is authorized.

Organization Settings and Billing implementation note: Option 2, Control centre, now supplies a local read-only `/organization/[id]/settings` route. Owner and Admin can inspect current identity, structure, and commercial facts; Finance receives the bounded Billing and payouts projection only. Plan, subscription, seats, and payout connection remain separate, provider references stay private, and unsupported settings domains name their missing contracts. No save, checkout, cancellation, payout onboarding, security, integration, governance, schema, API, or production promotion is authorized.

Public Organization implementation note: Option 2, Opportunity-first profile, now supplies the existing local `/org/[organizationId]` route. It uses the current minimum public allowlist, keeps published Opportunities ahead of unsupported institutional history, supports optional approved Opportunity media without a field label, derives practice context from displayed linked Opportunities, and excludes internal Program names, domains, verification flags, and Organization operations. Follow, report, public-profile editing, slug migration, and deployment remain blocked.

Hosted application implementation note: Option 2, Application desk, now supplies the existing local `/org/[organizationId]/[openCallId]` route. It separates public Opportunity reading, signed-out return, and the current private form; keeps approved optional media out of the form workspace; bounds the editor column; and names the missing Review, form-version, conflict, upload-lifecycle, deadline, payment-reconciliation, and complete-receipt contracts. Works precede questions, Required and Optional are textual, file limits are visible, and submit actions name the known fee. Deployment and the complete target contract remain blocked.

Organization family validation note: 27 local Chromium tests now pass across chooser, Overview, Opportunities, Submission queue and dossier, Reviews, Decisions, Messages, Delivery, Insights, People, Settings and billing, public Organization, hosted application, selected-only mobile routes, retained comparisons, foreign-tenant isolation, 390px fit, and serious/critical Axe checks. This verifies the current local implementation only; it does not satisfy the documented mutation, model, deployment, or production-promotion gates.

The order of work is deliberate:

1. understand the person and the decision they are making;
2. define the page objective and data contract;
3. define the required states and edge cases;
4. define the functional building blocks;
5. only then compare premium components against that contract;
6. keep all selected references in the local design library until a page is approved for implementation.

The completed July UX specification remains historical evidence. It is not the authority for this redesign where it conflicts with Style Guide 2.0, the Forest color direction, current code, current taxonomy, or the decisions in this plan.

Current page-family contracts:

- Whole-site route and selection coverage audit: [`missa-overhaul-coverage-audit-2026-08-08.md`](./missa-overhaul-coverage-audit-2026-08-08.md)
- Shared public, Profile, Organization, reviewer, and Platform Admin shell contract: [`missa-shared-shells-contract-2026-08-08.md`](./missa-shared-shells-contract-2026-08-08.md)
- Shared shell visual directions: [`missa-shared-shells-visual-directions-2026-08-08.md`](./missa-shared-shells-visual-directions-2026-08-08.md), with Option 02 selected at `/design-system/shell` and all directions retained at `/design-system/shell-directions`
- Public and acquisition contract: [`missa-public-acquisition-contract-2026-08-08.md`](./missa-public-acquisition-contract-2026-08-08.md)
- Public and acquisition visual directions: [`missa-public-acquisition-visual-directions-2026-08-08.md`](./missa-public-acquisition-visual-directions-2026-08-08.md), selected by page job at `/design-system/public-acquisition` with all directions retained at `/design-system/public-acquisition-directions`
- Authentication and onboarding contract: [`missa-auth-onboarding-contract-2026-08-08.md`](./missa-auth-onboarding-contract-2026-08-08.md)
- Authentication and onboarding visual directions: [`missa-auth-onboarding-visual-directions-2026-08-08.md`](./missa-auth-onboarding-visual-directions-2026-08-08.md), selected by journey at `/design-system/auth-onboarding` with all directions retained at `/design-system/auth-onboarding-directions`
- Creator Home, Tracker Import, and Ask contract: [`missa-creator-utilities-contract-2026-08-08.md`](./missa-creator-utilities-contract-2026-08-08.md)
- Creator Home, Tracker Import, and Ask visual directions: [`missa-creator-utilities-visual-directions-2026-08-08.md`](./missa-creator-utilities-visual-directions-2026-08-08.md), with Option 02 selected at `/design-system/creator-utilities` and all directions retained at `/design-system/creator-utilities-directions`

- Opportunities browse/detail: [`missa-opportunities-screen-contract-2026-08-08.md`](./missa-opportunities-screen-contract-2026-08-08.md)
- Opportunity Detail selected synthesis and visual rationale: [`missa-opportunity-detail-directions-2026-08-08.md`](./missa-opportunity-detail-directions-2026-08-08.md), reviewed locally at `/design-system/opportunity-detail`
- Tracker and submission detail: [`missa-tracker-submissions-screen-contract-2026-08-08.md`](./missa-tracker-submissions-screen-contract-2026-08-08.md)
- Tracker selected synthesis and visual rationale: [`missa-tracker-visual-directions-2026-08-08.md`](./missa-tracker-visual-directions-2026-08-08.md), reviewed locally at `/design-system/tracker`
- Library and Work Detail: [`missa-library-work-screen-contract-2026-08-08.md`](./missa-library-work-screen-contract-2026-08-08.md)
- Library and Work selected Option 2 rationale: [`missa-library-work-visual-directions-2026-08-08.md`](./missa-library-work-visual-directions-2026-08-08.md), reviewed locally at `/design-system/library-work`
- Library and canonical Work detail now use the selected Working Archive locally at `/library` and `/library/works/[workId]`; owner-scoped reference-safe deletion, URL state, real taxonomy, phone layouts, and private file access are implemented and not deployed. Work versions, archive/restore, and exact submitted-version linkage remain model work.
- Creator Inbox: [`missa-inbox-screen-contract-2026-08-08.md`](./missa-inbox-screen-contract-2026-08-08.md)
- Creator Inbox selected synthesis and visual rationale: [`missa-inbox-visual-directions-2026-08-08.md`](./missa-inbox-visual-directions-2026-08-08.md), compared at `/design-system/inbox-directions` and reviewed locally at `/design-system/inbox`
- Tracker Calendar: [`missa-calendar-screen-contract-2026-08-08.md`](./missa-calendar-screen-contract-2026-08-08.md)
- Tracker Calendar directions: [`missa-calendar-visual-directions-2026-08-08.md`](./missa-calendar-visual-directions-2026-08-08.md)
- Profile: [`missa-profile-screen-contract-2026-08-08.md`](./missa-profile-screen-contract-2026-08-08.md)
- Profile directions: [`missa-profile-visual-directions-2026-08-08.md`](./missa-profile-visual-directions-2026-08-08.md)
- Organization chooser and overview: [`missa-organization-chooser-overview-contract-2026-08-08.md`](./missa-organization-chooser-overview-contract-2026-08-08.md)
- Organization chooser and overview directions: [`missa-organization-visual-directions-2026-08-08.md`](./missa-organization-visual-directions-2026-08-08.md), with Option 01 selected at `/design-system/organization` and all directions retained at `/design-system/organization-directions`
- Organization Opportunities and call builder: [`missa-organization-opportunities-builder-contract-2026-08-08.md`](./missa-organization-opportunities-builder-contract-2026-08-08.md)
- Organization Opportunities and call-builder directions: [`missa-organization-opportunities-visual-directions-2026-08-08.md`](./missa-organization-opportunities-visual-directions-2026-08-08.md), with Option 01 selected at `/design-system/organization-opportunities` and all directions retained at `/design-system/organization-opportunities-directions`
- Organization Submissions, Reviews, and Decisions: [`missa-organization-submissions-reviews-decisions-contract-2026-08-08.md`](./missa-organization-submissions-reviews-decisions-contract-2026-08-08.md)
- Organization Submissions, Reviews, and Decisions directions: [`missa-organization-workflow-visual-directions-2026-08-08.md`](./missa-organization-workflow-visual-directions-2026-08-08.md), compared locally at `/design-system/organization-workflow-directions`

## 2. Non-negotiable product rules

- Design for the user's task, not for the component catalogue.
- Use **Profile**, **Opportunities**, **Tracker**, **Library**, and **Organization** in rendered product language. Do not render Passport, Workspace, Radar, or Trust Layer to customers.
- Use a true-white canvas and the semantic Forest system in `docs/missa-color-direction.md`. Legacy Aubergine is not a current action token.
- Use canonical taxonomy IDs behind ordinary labels. Never store a display label when a stable term ID exists.
- Practice taxonomy, opportunity type, eligibility, geography, fee, deadline, and source evidence answer different questions. Never collapse them into one filter or score.
- Opportunity imagery is optional context. Show a useful source-provided image directly, without a visible media heading or caption added by Missa; use a quiet neutral fallback when no useful image exists.
- Customer-facing opportunity cards and pages do not include a freshness card, freshness status, check time, refresh score, refresh prompt, or update notice. Source monitoring and refresh work remain an Admin/Radar responsibility.
- Customer browse does not expose a freshness filter, “recently verified” sort, or verified-age ranking control. Keep legacy query fields only as compatibility inputs during migration.
- Keep the official source or guidelines link close to consequential opportunity information.
- Unknown is a valid state. Never turn missing information into “No fee,” “Open to everyone,” “Rolling,” or another claim.
- Do not predict artistic quality or likelihood of acceptance.
- Do not expose internal confidence scores, extraction state, schema names, queue names, or worker language outside platform administration.
- Premium Shadcn Studio references remain local review material until a page contract, responsive behavior, accessibility behavior, and promotion diff are approved.

## 3. Evidence used

This plan is grounded in the current route tree, current page source, current domain models, and these authorities:

- `DESIGN.md`
- `docs/missa-content-style-guide.md` — Style Guide 2.0
- `docs/missa-color-direction.md`
- `docs/missa-naming-decisions.md`
- `docs/missa-frontend-ia.md`
- `docs/missa-practice-taxonomy.md`
- `docs/missa-taxonomy-schema.md`
- `packages/taxonomy/src/*`
- `packages/contracts/src/opportunities.ts`
- `packages/radar-engine/src/domain/types.ts`
- `packages/workspace-engine/src/domain/types.ts`
- the current `apps/web/app` route inventory

Current code proves that Missa has four surfaces with different jobs: public acquisition, creator Profile, Organization operations, and platform administration. It also proves that several visible routes are aliases or partial placeholders today; the overhaul must not turn those placeholders into permanent top-level navigation simply because a route exists.

## 4. People and their jobs

| Person | Context | Primary job | What success feels like | Main risks |
| --- | --- | --- | --- | --- |
| Public visitor | Signed out, often from search or a shared link | Understand Missa or evaluate one opportunity | “I know what this is and what to do next.” | Auth wall too early, vague claims, duplicate public/signed-in pages |
| Creator | Finding, preparing, submitting, and tracking work | Decide whether an opportunity is worth pursuing | “The relevant facts are clear and I can act without losing context.” | Filter overload, taxonomy overload, missing or conflicting facts, mobile friction |
| Returning creator | Has saved work, searches, and submissions | See what needs attention | “I can resume quickly.” | Noisy dashboard, hidden deadlines, duplicate records, stale local state |
| Public-profile owner | Controls identity and privacy | Present selected work and identity safely | “Only what I chose is public.” | Private preference leakage, unclear privacy, accidental publication |
| Organization owner/admin | Owns access, billing, and program setup | Configure and oversee the Organization | “I can see the whole operation and control access.” | Tenant leakage, unclear permissions, billing surprises |
| Team admin | Manages people and access | Invite, remove, and assign roles | “The right people have the right access.” | Role ambiguity, destructive access changes |
| Program manager | Runs calls and submissions | Publish a call and move submissions through review | “Nothing in my program is hidden or ambiguous.” | Form complexity, incomplete publication, poor queue density |
| Reviewer | Occasional, task-focused collaborator | Review assigned submissions | “I can understand the brief and finish without training.” | Too much Organization chrome, accidental access to other submissions |
| Finance | Payment and fee operations | Reconcile fees, refunds, and billing | “Amounts and exceptions are traceable.” | Confusing payment vs. submission status |
| Legal | Guidelines, rights, consent, and policy | Review consequential wording and records | “The exact version and decision trail are available.” | Silent content changes, missing provenance |
| Viewer/guest/member | Limited or compatibility role | Observe or complete a narrow task | “I can tell what I may view or change.” | Disabled actions without explanation, over-broad access |
| Missa content operator | Internal | Review ambiguous opportunity content | “The source, extracted facts, unknowns, and decision are together.” | Customer language mixed with engine language |
| Missa taxonomy/governance operator | Internal | Govern terms, mappings, coverage, and proposals | “Changes are evidence-backed and reversible.” | Silent deletion, alias loss, culturally unsafe labels |
| Missa support/operations operator | Internal | Diagnose accounts, jobs, integrations, and delivery | “I can answer what happened without guessing.” | Cross-tenant mistakes, destructive controls, missing audit trail |

## 5. Domain and taxonomy model for UX

### 5.1 Questions the interface must keep separate

| Question | System object | Examples | Where it belongs |
| --- | --- | --- | --- |
| What does the person make or do? | 12-facet practice taxonomy | Discipline, form, genre, medium, role, language | Profile, Library Work, matching, Organization call rules |
| What kind of opening is this? | Opportunity type | Grant, residency, magazine, award, commission | Browse, opportunity detail, call creation |
| Who may apply? | Eligibility rules | Age, career stage, identity, organization type | Opportunity detail, Profile private attributes, call rules |
| Where can they apply from or participate? | Geography/location rules | Nigeria, West Africa, remote, on-site | Browse, Profile preferences, eligibility detail |
| What does applying cost? | Fee state | No fee, paid amount, not stated | Browse, detail, call form/payment |
| When is action due? | Deadline state | Exact, rolling, until filled, conflicting, unknown | Browse, detail, Tracker, Calendar view |
| What must be submitted? | Required materials/form fields | Portfolio, statement, files, answers | Opportunity detail, Library, submission flow |
| Where did the information come from? | Source/provenance | Official call page, guidelines | Opportunity detail and admin review |
| Is the backend record healthy? | Operational freshness/confidence | Fetch, process, score, conflict | Platform Admin only |

### 5.2 The 12 practice facets

The canonical graph contains independent facets: practice family, discipline, form, genre, subgenre, medium, technique/process, mode/approach, role, theme/subject, audience, and language.

The interface must use progressive disclosure:

- **Browse quick filters:** opportunity type, broad practice/discipline, location, fee, deadline.
- **Browse advanced filters:** form, genre, medium, language, audience, theme, role, and other useful facets only after a person asks for more control.
- **Profile onboarding:** broad practice, role, location, languages, opportunity preferences, and eligibility attributes needed for matching. Do not ask for all 1,084 terms.
- **Library Work:** the richest work-specific description, because form, genre, medium, technique, role, theme, audience, and language can describe one Work precisely.
- **Organization call builder:** accepted/preferred/required/excluded canonical terms, kept separate from eligibility and form questions.
- **Matching explanation:** show a small number of observable intersections such as “Photography · Open to Nigeria · No fee,” never the graph or a bare score.
- **Admin taxonomy:** expose aliases, evidence, relations, mappings, scheme version, proposals, deprecations, and coverage because governance is the user's job there.

### 5.3 Taxonomy edge cases

- A term can have multiple parents; do not force it into one path.
- A label can change while its ID remains stable.
- Aliases, source phrases, abbreviations, historical names, and community-preferred names must resolve without becoming duplicate visible options.
- Deprecated terms need a visible replacement path in editing flows, but historical records remain readable.
- Unknown or stale URL term IDs are removed safely and explained only when the correction affects the user's result.
- A valid taxonomy term can have no current opportunity coverage. Say that Missa has no matching records in the current collection, not that no opportunities exist.
- Culturally sensitive terms require preferred naming and provenance review.
- Eligibility must never be inferred from practice, genre, language, or location labels alone.

## 6. Target information architecture

### 6.1 Public shell

Primary navigation: **Home · Opportunities · Guides · For organizations**. Account actions: **Log in · Create account**.

Public browsing and signed-in browsing should use one canonical opportunity route family. Signing in adds private matching and save/track actions; it does not send the person to a duplicate design.

Target canonical routes:

- `/opportunities`
- `/opportunities/[slug]`
- `/organizations/[slug]`
- `/organizations/[slug]/opportunities/[callSlug]`
- `/guides` and `/guides/[slug]`
- `/discover/[slug]` for curated, indexable collections only

Compatibility redirects can preserve current URLs such as `/opportunities-preview`, `/discover/opportunities/[id]`, and `/org/[organizationId]` while the route migration is staged.

### 6.2 Profile shell

Primary navigation: **Opportunities · Tracker · Library**. The Missa identity returns to Home. **Inbox** and **Profile** are utility destinations.

Do not create top-level destinations solely because aliases exist today:

- Calendar is a Tracker view until it has a distinct cross-product job.
- Insights is a Tracker/Profile view until it has distinct decisions and real data.
- Messages is an Inbox section until a durable conversation model warrants its own product destination.
- “My submissions” is a Tracker view with a canonical submission-detail route.

### 6.3 Organization shell

Rendered product name: **Organization**. The current `/workspace` path may survive temporarily as a compatibility route, but no customer-facing label should say Workspace.

Primary work areas: **Overview · Opportunities · Submissions · Reviews · Decisions**.

Secondary work areas: **Messages · Delivery · Insights · People · Settings**.

The shell always shows the current Organization and a switcher when the account belongs to more than one. Navigation and actions are role-aware. Reviewer invite flows should enter a focused review shell, not the full owner/admin shell.

### 6.4 Platform Admin shell

Admin remains visually related to Missa but operationally distinct. Recommended groups:

- **Operate:** Control Room, Operations, Agents, Radar, System
- **Review:** Content, Taxonomy, Governance, Audit
- **Serve:** Customers, Organizations, CRM, Support, Messaging
- **Business:** Billing, Analytics

Freshness, fetch/process state, confidence, trust scoring, source health, retries, and worker controls belong here.

## 7. Shared shell contracts

### Public shell

- Consistent wordmark, container grid, account-entry pattern, and footer.
- The current section is visible without relying on color alone.
- Mobile navigation preserves Create account as a visible action.
- Search-origin pages preserve the path back to results.

### Authenticated shell

- One identity system across Profile and Organization.
- Clear Profile/Organization switcher, not a hidden profile-menu secret.
- Organization context persists in every Organization URL and server action.
- Utility actions and account settings do not compete with primary work.
- Mobile uses a compact top bar plus reachable navigation; no desktop sidebar squeezed into a phone.

### Page frame

Every product page defines:

1. location and back-state;
2. plain page title;
3. one primary job/action;
4. compact status or scope summary when necessary;
5. main work area;
6. feedback and recovery region;
7. contextual help only where the task is unfamiliar or consequential.

## 8. Screen contracts

The “functional blocks” below describe jobs, not visual components or premium variants.

### 8.1 Public and acquisition

| Current/target route | User objective | Functional blocks | Taxonomy/data | Required edge states | Overhaul decision |
| --- | --- | --- | --- | --- | --- |
| `/` | Understand Missa and choose a path | Public shell, concise hero, real opportunity proof, creator value, Organization value, CTA, footer | Only safe public opportunity projections | No suitable featured record, image missing, signed-in return visitor, slow image | Keep editorial character; never feature a low-quality record to fill space |
| `/about` | Understand what Missa believes and does | Narrative header, principles, two-audience explanation, next action | None beyond truthful product claims | Claims lacking evidence | Keep short; do not duplicate methodology |
| `/for-organizations` | Decide whether to run a call on Missa | Value proposition, end-to-end workflow, role/team explanation, proof, CTA | Opportunity and submission lifecycle | No customer proof, illustration vs. live data, mobile | Show one credible workflow, not decorative metrics |
| `/guides` | Find practical guidance | Guide index, topic grouping, search/filter if inventory warrants it | Opportunity type and broad practice tags | No results, long titles | Do not expose the entire taxonomy as navigation |
| `/guides/[slug]` | Answer one question and continue to a relevant opportunity | Article, contents, examples, related opportunities, source links | Only taxonomy needed to connect relevant records | Missing related records, external-source failure | Reading comes before conversion blocks |
| `/methodology` | Understand how Missa handles evidence | Plain process explanation, boundaries, official-source guidance, issue reporting | Customer-safe provenance only | No public freshness or confidence metrics | Remove customer freshness teaching; explain source use and unknowns |
| `/discover/[slug]` | Browse a curated indexable collection | Collection introduction, compact criteria, results, related guide | Canonical collection term IDs and opportunity type | Thin/zero coverage, stale URL term | Explain collection coverage without claiming the world is empty |
| `/opportunities` | Evaluate available opportunities | Search, compact quick filters, results, sort, filter panel, pagination, selected context | Type, practice, location, fee, deadline; advanced facets on demand | Zero results, invalid term, network error, no image, unknown facts, signed out/in | Canonical public and signed-in browse; remove `/opportunities-preview` duplication |
| `/opportunities/[slug]` | Decide whether to pursue one opportunity | Identity/image, decisive facts, requirements, eligibility, official source, save/track/apply, issue report | Full public opportunity projection; private match reasons only when signed in | Closed, conflicting deadline, missing fee, unsafe/missing submission link, no image, not found | One canonical detail page enhanced by authentication |
| `/organizations/[slug]` | Understand an Organization and its live opportunities | Organization identity, description, published opportunities, website, follow when signed in | Organization and published calls | No live calls, unconfirmed identity, missing logo | Migrate from `/org/[id]` with redirect |
| `/organizations/[slug]/opportunities/[callSlug]` | Read a hosted call and begin/continue a submission | Call identity, guidelines, eligibility, categories, form preview, sign-in/continue action | Call taxonomy rules, eligibility, form schema | Closed while viewing, login return, draft recovery, fee/payment state | Public read first; authenticate only when submission requires it |
| `/profile/[userId]` | View a creator's intentionally public identity | Public identity, bio, selected public Works/links, privacy boundary | Public-safe practice labels only | Private profile, removed Work, no public content | Never show private preferences, tracker counts, applications, or eligibility attributes |
| `/waitlist` | Join when access is unavailable | Short explanation, email form, consent, confirmation | Minimal account intent | Duplicate email, invalid email, service failure | Retire when open signup is the normal path |

### 8.2 Authentication and onboarding

| Route | User objective | Functional blocks | Taxonomy/data | Required edge states | Overhaul decision |
| --- | --- | --- | --- | --- | --- |
| `/login` | Return to the interrupted task | Identity, credentials, recovery, SSO when available, safe return path | Session and encoded destination | Invalid credentials, expired session, rate limit, unsafe `next` | One calm task; no product tour inside the form |
| `/signup` | Create an account and choose initial intent | Account fields, creator/Organization intent, terms, confirmation | Intent only; not full taxonomy | Existing account, verification delay, invite-based signup, unsafe return path | Keep initial signup short |
| Target `/onboarding/profile` | Give Missa enough context for useful results | Progress, broad practice, roles, location/language, opportunity preferences, skip/save | Progressive taxonomy and separate preferences/eligibility | Multi-practice person, no matching label, prefer/exclude conflicts, partial completion | Do not ask for all facets; allow later refinement |
| Target `/onboarding/organization` | Establish Organization identity and first program | Organization details, domain/invite context, first-call choice | Organization, program, opportunity type | Invited user, duplicate Organization, domain mismatch | Route invitees according to their role |

### 8.3 Profile product

| Current/target route | User objective | Functional blocks | Taxonomy/data | Required edge states | Overhaul decision |
| --- | --- | --- | --- | --- | --- |
| `/home` | Resume the most useful next task | Greeting/scope, attention list, saved progress, relevant opportunities | Private preferences, tracker, drafts, Inbox | New account, no activity, many urgent items, unavailable integration | Replace current redirect with a real Home only when the data supports it; otherwise use Opportunities |
| `/opportunities` | Find and compare opportunities | See public contract plus saved state and “why this fits” | Preference intersections, not artistic judgment | Incomplete Profile, hidden recommendation, zero personal matches | Public browse remains fully useful without a Profile |
| `/opportunities/[slug]` | Decide, save, track, or apply | See public contract plus private fit reasons and preparation | Profile, Work, Tracker state | Profile contradiction, already submitted, duplicate tracked record | Do not repeat the public page in a different layout |
| `/tracker` | See and move opportunities/submissions through personal states | View switcher, grouped/list views, inline status, deadline/calendar view, import | Interested, preparing, submitted, withdrawn, accepted, declined, archived | Missing opportunity, duplicate import, mixed Work decisions, closed call, large history | Tracker owns Calendar, Works, Types, Organizations, and List views |
| `/tracker/submissions/[submissionId]` | Understand one submission and its outcome | Receipt, submitted Works, answers/files, messages/decisions, withdraw action | Submission, Work, per-Work Decision | Partial acceptance, payment dispute, withdrawn, organization deleted, file unavailable | Replace “My submissions” route duplication with canonical Tracker detail |
| `/library` | Reuse Works, files, and answers safely | Tabs/views for Works, Files, Saved Answers; search; add/edit | Rich Work taxonomy and privacy | Empty library, duplicate file, unsupported file, upload failure, storage limit | Taxonomy belongs primarily on the Work, not every upload |
| Target `/library/works/[workId]` | Describe and maintain one Work | Identity, files/versions, taxonomy, rights/privacy, submission history | All relevant practice facets | Multi-medium Work, missing term, deprecated term, file version conflict | Preserve historical submission snapshots when a Work changes |
| `/inbox` | See consequential updates and communication | Sections/filters, unread state, item detail, action | Alerts, organization messages, submission decisions | Empty, repeated system alert, deleted target, delivery failure | Messages live here until durable conversations justify a separate module |
| `/import` | Bring an existing tracker into Missa | Upload/paste, mapping preview, duplicate resolution, commit summary | Opportunity matching and status mapping | Unsupported format, malformed dates, duplicates, partial import, cancel/retry | No write until preview and confirmation |
| `/ask` | Ask a bounded question about opportunities | Conversation, suggested questions, cited results, correction path | Only source-backed opportunity data | Feature disabled, no answer, unsafe request, source unavailable | Keep behind capability flag; never replace browse/detail tasks |
| `/profile` | Control identity, private matching inputs, privacy, integrations, following, and saved searches | Section navigation, profile editor, preferences, privacy, integrations, saved searches, following | Private taxonomy preferences and eligibility attributes | Partial profile, sync revoked, export failure, private/public conflict | Split the current long stack into clear sections |
| Target `/profile/privacy` | Understand and control what is public | Visibility controls, public preview, consequences | Public vs. private field map | Existing public link, unpublishing, child records | Default private for matching/eligibility inputs |
| Target `/profile/integrations` | Connect or repair email and calendar services | Connection status, scope explanation, connect/disconnect, recovery | OAuth state and sync mode | Revoked token, partial scope, duplicate connection, provider outage | No internal provider jargon |
| Target `/profile/saved-searches` | Create and manage repeatable searches | Search definition, digest setting, rename/delete | Canonical query state | Deprecated term, zero results, duplicate name | Preserve stable IDs and show affected filters |

### 8.4 Organization product

| Current/target route | User objective | Functional blocks | Taxonomy/data | Required edge states | Overhaul decision |
| --- | --- | --- | --- | --- | --- |
| `/organization` or compatibility `/workspace` | Choose an Organization or create/join one | Organization switcher, membership summary, create/join action | Membership and role | No memberships, one membership, suspended Organization | Never show an empty admin dashboard without context |
| `/organization/[id]/overview` | Know what needs attention | Program/call summary, submission/review/decision queues, next actions | Organization-scoped lifecycle data | No calls, role-limited view, delayed jobs | Counts link to the exact filtered queue |
| `/organization/[id]/opportunities` | Create and manage calls | Call list, status filters, create/duplicate/archive, preview | Opportunity type, program, call status | Draft with errors, published call, closed call, linked Radar record | Use “Opportunities” and “calls” in copy, never internal submission-path language |
| `/organization/[id]/opportunities/new` | Build a valid call | Guided sections, autosave, validation summary, preview/publish | Type, accepted taxonomy, eligibility, geography, dates, fees, form schema | Missing required fields, conflicting rules, draft recovery, imported guidelines | Separate call facts, eligibility, taxonomy, and submission form |
| `/organization/[id]/opportunities/[callId]` | Operate one call | Overview, edit, form, submissions, review rounds, decisions, public preview | Full call lifecycle | Published edits, closed call, linked source conflict, no submissions | Consequential edits show scope before confirmation |
| `/organization/[id]/submissions` or compatibility `/submissions` | Triage and assign submissions | Search/filter, saved views, bulk selection, assignment, detail pane | Submission status, category, call, reviewer, payment | Large queue, no results, permission limit, mixed statuses, missing files | Table/list density must collapse to cards/detail on mobile |
| `/organization/[id]/submissions/[submissionId]` | Review the complete submitted record | Applicant-safe identity, answers/files, Works, status, assignments, audit/activity | Submission, Work, taxonomy, payment | Withdrawn, partially accepted, file unavailable, private data restriction | Keep mutation actions explicit and audited |
| `/organization/[id]/reviews` | Configure and monitor reviews | Rounds, assignments, progress, unresolved items | ReviewRound, assignments, rubric | No reviewers, duplicate assignment, late review, reassignment | Review state is not decision state |
| `/organization/[id]/decisions` | Record and communicate outcomes | Decision queue, per-Work outcome, message preview, confirmation | Per-Work Decision and Submission summary | Mixed/partial outcome, missing decision, message failure, reversal policy | Never force one outcome on a multi-Work Submission |
| `/organization/[id]/messages` | Send and inspect operational communication | Templates/drafts, recipient scope, delivery state, thread/context | Submission/decision recipients | Partial delivery, invalid address, duplicate send, no durable ledger | State exactly what Missa knows was sent/delivered |
| `/organization/[id]/delivery` | Complete post-acceptance work | Accepted Works, tasks, owners, dates, status | DeliveryTask per accepted Work | Mixed submission, overdue task, no due date | Relabel by vertical where useful; keep generic model internally |
| `/organization/[id]/insights` | Answer operational questions | Defined metrics, date/scope controls, explanation/export | Calls, submissions, reviews, decisions | Small sample, missing period, incomplete data | Do not show vanity metrics or invented benchmarks |
| `/organization/[id]/people` | Manage members and roles | Member list, invitations, role change, remove/suspend | Ten Organization roles | Last owner, pending invite, self-removal, SCIM-managed member | Explain permission consequences before change |
| `/organization/[id]/settings` | Manage identity, billing, integrations, and policy | Section navigation, settings forms, billing/seats, integrations | Organization, plan, membership, payment | Past due, cancel pending, seat limit, provider outage | Owner/admin-only actions are not shown as dead controls to other roles |

### 8.5 Reviewer experience

| Current/target route | User objective | Functional blocks | Taxonomy/data | Required edge states | Overhaul decision |
| --- | --- | --- | --- | --- | --- |
| `/reviewer` or target `/reviews` | See only assigned review work | Focused queue, call brief, progress, due state | Reviewer assignments only | No assignments, removed assignment, multiple Organizations | Minimal shell; no owner/admin clutter |
| Target `/reviews/[assignmentId]` | Complete one review accurately | Submission materials, fixed rubric, notes, save/submit, next assignment | Assignment, Submission, Works, call criteria | File unavailable, autosave conflict, already completed, reassigned | Keyboard-friendly and interruption-safe |

### 8.6 Platform administration

| Route | Operator question | Functional blocks | Required edge states |
| --- | --- | --- | --- |
| `/admin` | What needs attention now? | Health summary, prioritized worklist, direct queue links | Partial data, subsystem unavailable |
| `/admin/operations` | Which jobs or queues are blocked? | Queue filters, status/age, row detail, safe actions | Retry limit, duplicate action, worker unavailable |
| `/admin/agents` | What are agents doing and where is human action required? | Agent status, handoffs, controls, audit evidence | Stale heartbeat, ambiguous ownership, action failure |
| `/admin/radar` | Are sources, fetches, extraction, and publication healthy? | Source health, freshness, failures, coverage, record drill-down | Network vs. processing failure, disabled source, conflicting evidence |
| `/admin/content` | Which records need editorial review? | Review queue, source/content comparison, unknowns, approve/block | Missing snapshot, concurrent decision, no canonical source |
| `/admin/taxonomy` | Which terms or mappings need governance? | Facets/terms, proposal queue, evidence, aliases, relations, coverage | Deprecated term in use, culturally sensitive change, conflicting mapping |
| `/admin/governance` | Are policy and review controls working? | Governance metrics, exceptions, approvals | Missing owner, overdue control, incomplete evidence |
| `/admin/audit` | Who changed what and when? | Immutable event list, filters, detail/export | Large history, redacted data, unavailable actor |
| `/admin/system` | Are infrastructure and integrations ready? | Service status, configuration presence, non-secret diagnostics | Secret absent, dependency degraded, partial deploy |
| `/admin/customers` | Which accounts need help? | Search, account summary, activity, safe support actions | Duplicate accounts, inactive user, privacy boundary |
| `/admin/organizations` | Which Organizations need support or review? | Organization list, plan/status, membership, drill-down | Suspended org, no owner, tenant boundary |
| `/admin/crm` | What is the relationship history? | Account/org timeline, notes, follow-up state | Missing consent, duplicate contact |
| `/admin/support` | What support work is open? | Queue, status/owner, linked account evidence, response state | Sensitive content, unresolved dependency |
| `/admin/messaging` | What outbound communication happened? | Event/delivery list, failure detail, safe retry | Partial delivery, provider outage, duplicate retry |
| `/admin/billing` | What billing state needs action? | Account/org billing records, invoices/events, exceptions | Past due, dispute, refund, provider mismatch |
| `/admin/analytics` | Are product and operational funnels working? | Defined metrics, segment/date controls, data-quality notes | Missing events, low sample, lagging warehouse |

The current Organization-scoped `/admin/taxonomy` page should move under the platform Admin shell unless a separate Organization taxonomy use case is later defined. Platform governance and tenant configuration are different jobs.

## 9. End-to-end journey contracts

### Creator: search to submission

```text
Search/shared link → canonical opportunity browse/detail
  → optional signup with return path
  → save or track
  → choose/reuse Work from Library
  → complete hosted or external submission
  → Tracker receipt and status
  → Inbox decision/message
```

Continuity requirements: originating query, selected opportunity, scroll position, draft, Work selection, and authentication return path survive navigation.

### Creator: onboarding to relevant browse

```text
Signup → broad practice and role → location/language → opportunity preferences
  → useful browse results immediately
  → refine Profile later from real decisions
```

Do not make exhaustive taxonomy completion a prerequisite for value.

### Organization: first call to decision

```text
Organization signup/invite → choose Organization → create call
  → facts and dates → practice rules → eligibility → submission form
  → preview → publish → receive submissions
  → assign review → record per-Work decisions → communicate → delivery
```

Every stage preserves Organization and call context. Publishing and decision communication require explicit confirmation and recovery.

### Reviewer: invitation to completed review

```text
Invite → authenticate → assigned queue → call brief
  → submission and Works → rubric/notes → submit review → next assignment or done
```

The reviewer never gains access to unassigned submissions through navigation or URL manipulation.

### Operator: source failure to safe recovery

```text
Control Room alert → Radar source/record detail
  → distinguish fetch, processing, conflict, or coverage issue
  → inspect evidence → take bounded action → audit entry → verify recovery
```

Operational freshness is visible here, not on customer opportunity cards.

## 10. Functional building-block objectives

No library component is selected in this section. These are the jobs a future component must satisfy.

| Building block | Objective | Must support | Must avoid |
| --- | --- | --- | --- |
| Global navigation | Establish current product, location, and next destination | Role/product switching, mobile, keyboard, active state | Hidden Organization access, duplicate destinations |
| Page header | State one page job and primary action | Long titles, breadcrumbs/back-state, scoped status | Decorative slogans in operational pages |
| Opportunity result | Support a fast pursue/skip decision | Optional image, title, Organization, deadline, fee, reach, one Save to Tracker action | Media labels, freshness UI, badge walls, every taxonomy facet |
| Opportunity detail | Support a consequential apply decision | Requirements, eligibility, official source, unknowns, link safety, signed-in actions | Raw engine scores, duplicate card content |
| Taxonomy chooser | Find and select canonical concepts without graph overload | Search, hierarchy, multi-parent terms, aliases, include/prefer/exclude | Dumping 1,084 terms, storing labels |
| Filter system | Narrow results while preserving context | URL state, quick/advanced split, active summary, clear all | First-viewport filter wall on mobile |
| Work editor | Describe one Work accurately and privately | Files/versions, rich taxonomy, privacy, history | Treating Profile preference as Work metadata |
| Status control | Change one explicit lifecycle state | Permissions, confirmation, optimistic/recovery states | Color-only state, impossible transitions |
| Submission form | Complete and safely retry an application | Draft, validation, file upload, fee/payment, idempotency | Losing work, submission-path jargon |
| Queue/list/table | Scan, filter, select, and act on many records | Density variants by viewport, bulk actions, detail drill-down | Cards for truly tabular comparisons, inaccessible horizontal overflow |
| Review workspace | Keep evidence and recommendation together | Autosave, fixed rubric, files, keyboard path | Organization administration clutter |
| Decision workspace | Record per-Work outcomes safely | Mixed outcomes, message preview, confirmation, audit | One forced outcome per packet |
| Feedback state | Explain what happened and how to recover | Loading, empty, partial, error, success, permission | Generic “Something went wrong” |
| Confirmation | Protect consequential actions | Exact object/action, reversible path, typed or second-step confirmation when justified | Modal fatigue for routine actions |
| Media frame | Provide useful visual context | Meaningful alt text or empty alt when decorative, crop/fallback, loading | Visible media headings added by Missa, invented imagery presented as source identity |

## 11. Cross-site state and edge-case matrix

Every page contract and later component review must cover the relevant rows.

| Dimension | States to design |
| --- | --- |
| Data | Loading, empty, partial, complete, malformed, conflicting, deleted, unavailable dependency |
| Network | Slow, offline during edit, timeout, retry, duplicate request, response after navigation |
| Authentication | Signed out, expired session, safe return, invited account, inactive account |
| Authorization | Owner/admin, role-limited, read-only, no membership, removed during session, last-owner protection |
| Taxonomy | No selection, many selections, multi-parent term, alias match, deprecated term, stale URL ID, zero coverage, culturally sensitive term |
| Opportunity | Open, opening soon, closing soon, closed, deadline unknown/rolling/conflicting, fee unknown/paid/no fee, submission link missing/unsafe/changed |
| Media | Valid source image, no image, broken URL, extreme aspect ratio, decorative image, missing alt text |
| Tracker | New, duplicate, imported, missing source record, archived, status conflict, large history |
| Submission | Draft, autosaved, validation failure, upload failure, payment failure, submitted, withdrawn, in review, partial/mixed decision |
| Review | Unassigned, assigned, reassigned, saved, completed, concurrent edit, file unavailable |
| Messaging | Draft, sent, partially delivered, failed, retried, duplicate-send risk, no durable delivery evidence |
| Integration | Not connected, connecting, connected, partial scope, revoked, provider outage, disconnected |
| Responsive | 320px narrow phone, 390px phone, tablet, laptop, wide desktop, zoom to 200% |
| Input | Keyboard, touch, mouse, screen reader, voice control, reduced motion, high contrast |
| Content | Very long title, long Organization name, multiple languages, RTL possibility, missing optional copy, unsafe user text |

## 12. Responsive and accessibility contract

- Public, Profile, and reviewer journeys are mobile-first. Complex Organization builders are desktop-optimized but every urgent read/approve/reply task remains usable on mobile.
- At 390 × 844, opportunity browse must show meaningful content from the first result in the first viewport.
- Touch targets are at least 44px on customer mobile surfaces. Compact Organization controls are desktop-only and expand on touch devices.
- No action is hover-only, icon-only without an accessible name, or available only through a context menu.
- Keyboard order follows visual order. Focus is visible against white and semantic surfaces.
- Tables provide a mobile list/detail alternative when horizontal comparison is not essential.
- Errors are associated with their field and summarized for long forms.
- Status never relies on color alone. Images never carry essential text.
- Motion respects reduced-motion settings and never blocks completion.
- Accessibility verification includes keyboard, screen reader semantics, contrast, zoom/reflow, and automated checks; screenshots alone cannot prove compliance.

## 13. Content, evidence, privacy, and safety

- Use Style Guide 2.0 literal headings and direct actions.
- Keep the fact, its limitation, and the next action together.
- Customer-facing source treatment is “Official source,” “Read official guidelines,” or the Organization website. Do not render backend check dates.
- Profile matching and eligibility attributes are private by default.
- Public profiles include only explicitly published fields and Works.
- Organization pages never expose another tenant's people, submissions, files, reviews, or billing through URLs, filters, counts, or cached state.
- External application links are checked before redirect. Missing, changed, unsafe, or closed destinations have distinct recovery copy.
- Generated summaries remain tied to an official source and do not become the authority over it.
- Split customer-safe source provenance from the operational source contract. Customer projections need the source name, kind, URL, and any approved organization confirmation; fetch/check/process timestamps, verified-until values, scores, and failure state belong in Admin projections.
- Destructive actions state what will be removed, what remains, who is affected, and whether recovery is possible.

## 14. Component-selection gate

A premium component may be considered only after the consuming page has an approved screen contract.

For every candidate, record:

1. page and user job;
2. functional objective;
3. required data and taxonomy behavior;
4. required states from the edge-case matrix;
5. mobile and keyboard behavior;
6. semantic/accessibility contract;
7. token and content changes needed;
8. whether the reference contains demo-only decoration or hard-coded assumptions;
9. whether a local primitive already satisfies the job better;
10. promotion boundary and regression tests.

Reject a component when it:

- dictates the information architecture;
- requires customer-facing freshness or internal scores;
- cannot support unknown/partial/conflicting data;
- fails long content, no-image, or mobile states;
- hides actions behind hover or pointer-only interaction;
- duplicates a stable local primitive without a material UX gain;
- introduces its own palette, radius, type scale, or motion language;
- makes a table/card/dialog choice before the task justifies that pattern.

## 15. Overhaul sequence

### Phase 0 — approve contracts and capture baselines

- Approve this IA and the route consolidation decisions.
- Capture representative current flows at mobile and desktop for public opportunity, signed-in opportunity, Profile, Organization call creation/submissions, reviewer, and Admin Radar.
- Record current functionality that must survive the visual overhaul.
- Define analytics events for key transitions and failure states.

Current evidence:

- Public opportunity browse, detail, and empty state are captured in [`missa-opportunity-journey-phase-0-audit-2026-08-08.md`](./missa-opportunity-journey-phase-0-audit-2026-08-08.md).
- The same audit now includes a disposable authenticated login return, preference reasons, mobile detail sheet, save/track mutation, and Tracker handoff without touching the configured database.
- The first implementation-ready page contract is [`missa-opportunities-screen-contract-2026-08-08.md`](./missa-opportunities-screen-contract-2026-08-08.md).
- The approved local premium reference system is [`missa-premium-component-selections-2026-08-08.md`](./missa-premium-component-selections-2026-08-08.md); product promotion remains page-by-page and explicitly gated.
- Organization post-decision communication and accepted-Work fulfillment now have an implementation-backed screen contract in [`missa-organization-messages-delivery-contract-2026-08-08.md`](./missa-organization-messages-delivery-contract-2026-08-08.md). Option 02, Outcome desk, is selected in the local component library; unsupported message and delivery states remain fixtures and no product route is promoted.
- Organization Insights now has an implementation-backed screen contract in [`missa-organization-insights-contract-2026-08-08.md`](./missa-organization-insights-contract-2026-08-08.md). Option 02, Program lens, is selected in the local library and implemented as a read-only local Organization route. It separates Submission, Work, review-assignment, and fully decided Submission grains, blocks unsupported funnels and sensitive analysis, and uses a corrected projection without changing the compatibility report helper.
- Organization People and permissions now has an implementation-backed screen contract in [`missa-organization-people-permissions-contract-2026-08-08.md`](./missa-organization-people-permissions-contract-2026-08-08.md). Option 02, Access dossier, is selected and implemented as a read-only local Organization route. It separates person, membership, current role projection, scope, compatibility seat, account/provisioning hint, and assignment; unsupported invitation, scoped access, ownership transfer, and mutation contracts remain explicit.
- Organization Settings and Billing now has an implementation-backed screen contract in [`missa-organization-settings-billing-contract-2026-08-08.md`](./missa-organization-settings-billing-contract-2026-08-08.md). Option 02, Control centre, is selected and implemented as a read-only local Organization route. Each settings domain has an independent authority boundary; subscription billing, seats, invoices, payouts, security, integrations, data governance, and deletion remain separate concepts. Current Organization and commercial facts are represented honestly, provider references stay private, unsupported settings remain contract targets, and no product mutation is promoted.
- Public Organization profile now has an implementation-backed screen contract in [`missa-public-organization-profile-contract-2026-08-08.md`](./missa-public-organization-profile-contract-2026-08-08.md). Option 02, Opportunity-first profile, is selected and applied to the existing local public route. Published Opportunities precede unsupported institutional history, the coarse verification flag is withheld rather than converted to endorsement, optional media has quiet fallbacks, and practice labels are derived from the Opportunities shown rather than assigned as Organization expertise. Deployment and the unsupported full public-profile contract remain blocked.
- Hosted Opportunity application now has an implementation-backed journey contract in [`missa-hosted-application-contract-2026-08-08.md`](./missa-hosted-application-contract-2026-08-08.md). Option 02, Application desk, is selected locally. Public reading, private drafting, Work snapshots, Organization questions, review, payment, durable submission, and receipt remain distinct states; eligibility and practice rules are not collapsed into an inferred verdict. No hosted-call, payment, upload, receipt, or Tracker product route is changed.
- Private Profile editing has a current-state-backed contract in [`missa-profile-screen-contract-2026-08-08.md`](./missa-profile-screen-contract-2026-08-08.md). Option 02, Profile Ledger, is now promoted locally to `/profile` with URL-backed focused sections, separate identity/preferences/privacy mutation boundaries, progressive 12-facet refinement, public Tracker-activity removal, customer-safe integrations, real saved-search/following/export states, and focused desktop/390px accessibility checks. It is not deployed; public image/link/Work publication, calendar, eligibility self-description, large collections, and wider device/assistive-technology gates remain.
- The focused reviewer journey now has a current-state-backed contract in [`missa-reviewer-journey-contract-2026-08-08.md`](./missa-reviewer-journey-contract-2026-08-08.md). Option 02, Evidence Desk, is selected after 465 direction/fixture/width checks and now exists as bounded local product routes at `/reviews` and `/reviews/[assignmentId]`, with `/reviewer` redirecting for compatibility. The assigned-only page projection includes Organization, Opportunity, round, and Work titles but excludes submitter identity, answers, private taxonomy, file/provider details, and other reviewers. Three product tests pass for mobile switching/accessibility/overflow, read-only legacy recommendation, and foreign-assignment 404. Rubric, draft, blind policy, conflict, file authorization, immutable submission, and deployment remain blocked.
- Platform Admin now has a current-state-backed contract in [`missa-platform-admin-contract-2026-08-08.md`](./missa-platform-admin-contract-2026-08-08.md). Option 02, Evidence Control Room, is selected at `/design-system/admin` and applied across the local Admin family. Operate, Review, Serve, and Business replace the flattened shell groups; Taxonomy now uses the Admin layout; Control Room starts with consequence and evidence; and Operations persists queue, severity, search, and selected detail in the URL with mobile focus/return continuity. The Admin product regression traverses all domain routes at five widths without overflow and adds phone accessibility and screenshots. Broad `isAdmin`, immediate compatibility mutations, stable domain details, idempotency, audit-success, step-up/two-person approval, and deployment remain blocked.
- Creator Home, Tracker Import, and Ask Missa now share selected Option 02, Creator desk, at `/design-system/creator-utilities`; all three alternatives remain at `/design-system/creator-utilities-directions`. The comparison covers all 48 fixtures at 390px and 1280px, plus focused privacy, taxonomy, evidence, selected-route, and WCAG checks. Home still requires a typed next-task projection or redirect decision; Import remains no-write before confirmation; Ask remains bounded to published Opportunities. No product route, API, schema, or production data is changed.
- Organization chooser and overview now use selected Option 01, Context rail, at `/design-system/organization`; all three alternatives remain at `/design-system/organization-directions`. The comparison covers 150 direction/fixture/viewport combinations plus selected-route, role projection, tenant-leak, taxonomy-conflict, command recovery, and WCAG checks. The rail becomes an explicit switcher and scrollable destination index on mobile. No Organization product route, API, authorization projection, or tenant state is changed.
- Organization Opportunities and the call builder now use selected Option 01, Operational index, at `/design-system/organization-opportunities`; all three alternatives remain at `/design-system/organization-opportunities-directions`. The comparison covers 270 direction/fixture/viewport combinations plus role projection, independent taxonomy/eligibility/geography/fee/form blockers, safe publication, preserved failed saves, selected-route continuity, and WCAG checks. The public preview from Option 03 remains contextual rather than a permanent third column. No Organization product route, API, Opportunity record, or publication behavior is changed.
- Public/acquisition now uses Immediate Usefulness for Home, curated collections, and access; Editorial Evidence for About, For organizations, Guides, articles, Methodology, and public Profile. The selected system is at `/design-system/public-acquisition`, with all alternatives retained. The comparison covers 138 direction/page/state/viewport combinations plus truth, taxonomy, media, access-policy, public-Profile, collection, field-association, selected-route, and WCAG checks. No public product route, signup policy, API, structured data, or production content is changed.
- Authentication/onboarding now uses Task Return for login, signup, recovery, and verification; Guided Continuity for Profile and Organization onboarding. The selected system is at `/design-system/auth-onboarding`, with all alternatives retained. The comparison covers 294 direction/journey/state/viewport combinations plus safe return, field errors, taxonomy/privacy, invitation scope, unsupported target-state, selected-route, and WCAG checks. No auth route, session policy, invite exchange, recovery/verification API, or onboarding mutation is changed.
- The complete selected local system is now indexed at `/design-system`: 22 selected page-family compositions and 20 retained comparison routes. [`missa-selected-system-coherence-audit-2026-08-08.md`](./missa-selected-system-coherence-audit-2026-08-08.md) records 44 selected-route phone/desktop checks, no-overflow and customer-language boundaries, index WCAG A/AA scans, screenshots, and remaining product gates. No product route, API, schema, redirect, or deployment is changed.
- The first product-promotion tranche is recorded in [`missa-first-promotion-tranche-preflight-2026-08-08.md`](./missa-first-promotion-tranche-preflight-2026-08-08.md). Option 2 is implemented locally for canonical browse/detail, public/private DTO separation, permitted Opportunity media, canonical taxonomy URLs, one Save-to-Tracker action, typed authentication intent, SEO migration, and compatibility redirects. It is not deployed; remaining page families stay gated.

### Phase 1 — foundations and shells

- Finalize semantic tokens, typography, spacing, focus, density, and responsive rules.
- Build one public shell, one authenticated identity/switcher system, one Profile shell, one role-aware Organization shell, one reviewer shell, and one Admin shell in the local review environment.
- Resolve canonical routes and compatibility redirects.
- Do not redesign leaf pages before shell/state continuity works.

### Phase 2 — public opportunity journey

- Home proof module.
- Canonical `/opportunities` browse.
- Canonical opportunity detail.
- Public Organization and hosted call pages.
- Login/signup return continuity.
- Remove customer freshness filters/sorts and separate public source provenance from Admin source-health fields.

### Phase 3 — Profile journey

- Profile onboarding and preferences.
- Home/attention model.
- Tracker and submission detail.
- Library and Work detail.
- Inbox, import, integrations, privacy, and saved searches.

### Phase 4 — Organization journey

- Organization chooser/overview.
- Opportunity list and call builder.
- Submission queue/detail.
- Review rounds and reviewer assignment.
- Per-Work decisions, messaging, and delivery.
- People, settings, billing, and insights.

### Phase 5 — reviewer journey

- Focused assignment queue.
- Review workspace with interruption-safe saving.

### Phase 6 — platform administration

- Control Room and shared operational shell.
- Radar/source health and content review.
- Taxonomy/governance and audit.
- Customer, Organization, support, messaging, billing, and analytics operations.

### Phase 7 — promotion and regression

- Promote one page family at a time from local review to product code.
- Preserve unrelated work and existing API/domain contracts.
- Verify desktop/mobile behavior, keyboard, accessibility semantics, permissions, URL continuity, loading/error/empty states, and analytics.
- Use a stable non-production Vercel preview for remote/mobile review.
- Production promotion requires explicit approval.

## 16. Page-level approval template

Before a page enters component selection, its short spec must answer:

- Who is here, and what are they trying to decide or complete?
- What is the one primary action?
- What information is decisive, supporting, or deferred?
- Which taxonomy facets or rules are relevant, and which are deliberately hidden?
- What state must survive navigation, authentication, and reload?
- What are the loading, empty, partial, error, permission, and success states?
- What happens with no image, unknown data, long content, and a 390px viewport?
- What must keyboard and screen-reader users be able to do?
- What analytics event proves success or exposes failure?
- What current behavior must not regress?

Only after these answers are approved should the team compare premium component candidates.

## 17. Recommended first page sequence

The first redesign slice should be the canonical opportunity journey because it exercises the public shell, authenticated enhancement, taxonomy, optional media, filters, cards/results, detail, source links, save/track/apply actions, mobile behavior, and most shared states.

Sequence:

1. public/authenticated shell and route continuity;
2. `/opportunities` browse contract at desktop and 390px mobile;
3. `/opportunities/[slug]` detail contract;
4. login/signup return path;
5. save/track handoff into Tracker;
6. only then select and adapt premium components for those approved blocks.

The current local `profile-opportunity-journey` page is reference material, not the approved redesign. It must be rebuilt against this plan rather than promoted as-is.

## 18. Current route disposition

This table prevents the redesign from silently dropping or duplicating an existing destination.

| Current route or family | Target disposition |
| --- | --- |
| `/` | Retain as public Home |
| `/about` | Retain; keep distinct from Methodology |
| `/for-organizations` | Retain as Organization acquisition |
| `/guides`, `/guides/[slug]` | Retain |
| `/methodology` | Retain, but remove customer-facing freshness teaching |
| `/discover/[slug]` | Retain only for curated public collections |
| `/opportunities-preview` | Redirect to canonical `/opportunities` |
| `/discover/opportunities/[id]` | Redirect to canonical `/opportunities/[slug]` |
| `/opportunities` | Make canonical for public and signed-in browse |
| `/opportunities/[id]` | Migrate to canonical public/signed-in `/opportunities/[slug]` |
| `/org/[organizationId]` | Redirect to `/organizations/[slug]` |
| `/org/[organizationId]/[openCallId]` | Redirect to `/organizations/[slug]/opportunities/[callSlug]` |
| `/profile/[userId]` | Retain as public profile, with stricter public projection |
| `/waitlist` | Retain only while access is gated; then retire |
| `/login`, `/signup` | Retain with safe return-path continuity |
| `/home` | Build a real attention-based Home when data warrants it; until then redirect to Opportunities, not a placeholder dashboard |
| `/tracker` | Retain as the canonical personal lifecycle surface |
| `/my-submissions` | Merge into a Tracker Submissions view |
| `/my-submissions/[submissionId]` | Redirect to `/tracker/submissions/[submissionId]` |
| `/calendar` | Redirect to the Tracker Calendar view |
| `/insights` | Redirect to a defined Tracker/Profile insight view; do not keep an empty top-level module |
| `/messages` | Redirect to Inbox until durable conversations become a distinct product |
| `/inbox` | Retain as consequential updates and communication |
| `/library` | Retain and add canonical Work detail routes |
| `/import` | Retain as a Tracker utility |
| `/ask` | Retain only behind its capability flag |
| `/profile` | Retain as the private Profile control surface and split into clear subsections |
| `/workspace` | Compatibility redirect to the Organization chooser/overview; rendered label is Organization |
| `/workspace/reviews`, `/workspace/decisions`, `/workspace/messages`, `/workspace/delivery`, `/workspace/insights`, `/workspace/people`, `/workspace/settings` | Move under `/organization/[id]/...` while preserving `organizationId` |
| `/submissions` | Move under `/organization/[id]/submissions` |
| `/reviewer` | Migrate to the focused `/reviews` queue and assignment routes |
| Organization-scoped `/admin/taxonomy` | Move to platform `/admin/taxonomy` unless a separate tenant configuration use case is approved |
| `/admin` | Retain as Control Room |
| `/admin/operations`, `/admin/agents`, `/admin/radar`, `/admin/system` | Retain under the Operate group |
| `/admin/content`, `/admin/governance`, `/admin/audit` | Retain under the Review group |
| `/admin/customers`, `/admin/organizations`, `/admin/crm`, `/admin/support`, `/admin/messaging` | Retain under the Serve group |
| `/admin/billing`, `/admin/analytics` | Retain under the Business group |
| `/design-system/*` | Keep local/review-only; never treat as customer navigation or production page work |

## 19. Current-state validation snapshot

Repository validation on 8 August 2026 found:

- 126 `page.tsx` route files: 55 product pages and 71 local design-system review pages;
- every current product route is represented in the screen contracts or route-disposition table above;
- the current product still has duplicate public/authenticated opportunity pages and alias routes for Home, Calendar, Messages, and Insights;
- the current opportunity query contract still accepts `verifiedOnly` and `recently-verified`, and the public source contract still carries processing/check metadata;
- current customer components and pages still render freshness derived from operational source timestamps;
- Organization supports ten roles in the domain model, while the visible shell does not yet provide a complete role-specific information architecture;
- canonical practice taxonomy contains 12 independent facets and 1,084 seed terms, so a single global picker or flat filter list would be a design failure.

These are implementation gaps, not reasons to change production during planning. They become explicit migration and regression requirements for the relevant page phases. This document is a code- and contract-backed plan; representative local screenshots and the selected-system coherence audit now exist, while product/runtime visual baselines remain a page-promotion requirement.

## 20. Definition of plan completion

This planning phase is complete when:

- every current product route has a target owner, objective, and migration decision;
- every user role has a primary journey and permission boundary;
- taxonomy exposure is defined per surface rather than globally;
- customer and Admin source/freshness responsibilities are separated;
- cross-site states, mobile, accessibility, privacy, and safety requirements are explicit;
- the first page sequence and component-selection gate are approved;
- no premium component has been selected merely because it looks good in isolation.

## 21. Local overhaul completion status

The local Option 02 system is now implemented across the public, creator, Organization, Reviewer, and Platform Admin families covered by this plan. The final ordered Chromium regression passed **141 of 141 tests** on 8 August 2026, including phone layouts, tenant and owner isolation, safe return paths, critical/serious Axe checks, selected-system coherence, and retained comparison routes.

Two shared-contract defects found by the final run were corrected rather than waived: the primary Button no longer animates disabled opacity through a low-contrast intermediate state, and Library Work conflicts preserve their 409 response across Next development route chunks.

This completes the **local overhaul and review-library phase**, not production promotion. Deployment remains gated by explicit approval, real capability and persistence contracts, manual screen-reader/zoom/high-contrast review, analytics, migration and rollback plans, and the product gates recorded in the coverage audit.
