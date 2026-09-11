---
title: Missa submission portal Wave 0 contract
status: complete-for-planning
date: 2026-09-10
evidence_boundary: current-checkout-plus-arole-github-commit-ee1bf4f-and-official-submittable-documentation
next_wave: configurable-portal-foundation
---

# Missa submission portal — Wave 0

## Outcome

Wave 0 defines the contract for a configurable, organization-branded submission
portal. It reconciles four inputs:

1. the current Missa checkout;
2. the Arole Agarawu Prize application at GitHub commit
   `ee1bf4f888ada0cc3109fba95e2b42bc71aafa17`;
3. the existing Missa product and organization contracts; and
4. current official Submittable documentation.

This document is an implementation contract, not production certification.
Repository code and prior local verification establish what is present in the
checkout. They do not prove current production data, provider delivery, load,
tenant isolation under attack, or physical-device behavior.

## Product definition

The submission portal is one end-to-end system:

`Configure → Preview → Publish → Apply → Save → Submit → Receive → Triage → Review → Decide → Communicate → Deliver → Report`

Each organization configures this system through versioned data. Missa must not
fork application code, schemas, status vocabularies, or UI components per
organization.

## Non-negotiable boundaries

- An external click is not a submission.
- Payment is not submission proof.
- A receipt is not eligibility proof.
- Triage is not creative review.
- A review recommendation is not a decision.
- A decision does not send a message.
- A message marked for sending is not delivered.
- Acceptance does not prove publication, payment, attendance, or fulfillment.
- A packet may contain several Works with different outcomes.
- Published configuration changes never rewrite an existing draft or submitted
  packet silently.
- Authorization is enforced in server-authored queries and commands, not by
  hiding controls in the browser.

## 1. Current Missa audit

### 1.1 Existing domain foundation

| Capability | Evidence | Status | Wave 1 treatment |
| --- | --- | --- | --- |
| Organization → Team → Program → Opportunity hierarchy | `packages/workspace-engine/src/domain/types.ts`, relational tables | Reuse and harden | Keep the hierarchy; add configuration versions and scoped assignments. |
| Configurable application form | `SubmissionPath`, `SubmissionField` | Partial | Replace the four-field closed union with a versioned form schema. |
| Applicant draft | `SubmissionDraft`, draft route, 30-day cleanup | Partial | Add draft revision, form-version pinning, section progress, upload ownership, and recovery receipts. |
| Submission and Work | `Submission`, `Work`, finalization route | Reuse and harden | Preserve per-Work modeling; remove duplicate `fileUrl`/`fileUrls` representation. |
| Submission idempotency | command receipts and submission key | Reuse | Make all consequential commands idempotent. |
| Optimistic concurrency | resource revisions and `If-Match` handling | Reuse | Require it on configuration, assignment, review finalization, decision, and communication mutations. |
| Review rounds and assignments | domain types, relational commands, reviewer APIs | Partial | Add stage policy, reviewer groups, conflicts, deadlines, blind projection, and assignment history. |
| Review recommendation | fixed score and notes | Partial | Replace with versioned review-form answers and explicit draft/final state. |
| Per-Work decisions | relational and compatibility implementations | Reuse and harden | Add draft/final/corrected states, reason, policy override, and communicated-version linkage. |
| Delivery task | accepted-Work guard | Partial | Add configurable task types, ownership, evidence, visibility, and multiple tasks per Work. |
| Audit and outbox | relational transactional effects | Reuse | Establish typed event names and customer-safe projections. |
| Applicant receipt and Tracker connection | applicant routes and alerts | Partial | Make the receipt durable, downloadable, and explicitly version-bound. |
| Private upload and malware boundary | upload route and scanner | Partial | Provider-certify and attach files to typed owners instead of answer-string conventions. |
| Fees and payment reconciliation | Stripe checkout and webhook paths | Partial | Add waivers, currencies, refund/dispute projection, and provider certification. |
| Organization inbox and dossier | organization routes | Partial/read-heavy | Turn into an operational queue without collapsing lifecycle lanes. |
| Import | source-labelled preview/commit | Partial | Add provenance, resumability, file reconciliation, and Arole migration mapping. |

### 1.2 Execution-path finding

Missa currently supports a compatibility `WorkspaceEngine` and an opt-in
relational `RelationalWorkspace`. This is a transition boundary, not a permanent
architecture.

Wave 1 must not add a third service/repository layer. Every new portal mutation
must use relational authority, a database transaction, a command receipt, an
audit event, and an outbox event. Compatibility reads may remain temporarily
only when their cutover owner and removal condition are recorded.

### 1.3 Type and boundary findings

The anti-slop TypeScript review identified these priorities:

- `SubmissionFieldType` is precise but too small for the product; extend it as
  a discriminated union rather than broadening field configuration to
  `Record<string, unknown>`.
- HTTP bodies, import rows, provider events, environment variables, and raw
  database JSON are untrusted boundaries and should be validated once there.
- `WorkspaceCommandResult.data?: Record<string, unknown>` is too broad for
  normal application use. Commands that return data need concrete result types.
- `TenantScopedWorkspaceQueries.findOrganizationResource()` and relational
  `Row` aliases push broad records into application code. Add concrete query
  views per actual consumer instead of generic getters and extraction helpers.
- `Submission.answers` being a map is appropriate only at the stored dynamic
  form boundary. Convert it to a version-aware answer projection before normal
  business logic.
- `Work.fileUrl` and `Work.fileUrls` duplicate one concept. Migrate to an
  attachment relation; do not add another compatibility accessor.
- Status fields should remain literal unions or discriminated state objects.
  Do not accept arbitrary strings and normalize them later.
- The capability projection is useful navigation metadata, but it is not an
  authorization system. Route queries must enforce organization, Team, Program,
  Opportunity, assignment, field, identity, and file scope.

### 1.4 Existing state that must not be mistaken for completion

- Organization inventory and dossier routes are substantially read-only.
- Review assignment mutations exist, but the new product route intentionally
  withholds them until conflict, eligibility, workload, and scope rules agree.
- Decisions can be recorded, but the complete draft → final → communicate →
  correct lifecycle is absent.
- Relational authority has narrower coverage than the compatibility engine.
- Provider-backed email, payment, malware scanning, and Blob storage require
  separate live certification.
- Local stories and tests do not establish a complete hosted journey.

## 2. Arole application audit

### 2.1 Proven workflow concepts to carry forward

| Arole capability | Missa translation |
| --- | --- |
| Applicant registration and profile | Shared Missa account with application-specific identity snapshot. |
| One-person submission limit | Configurable applicant/category/Opportunity limit rule. |
| Private Supabase upload and signed download | Provider-neutral private attachment service with owner and projection policies. |
| Confirmation email | Durable receipt plus Inbox notification and email effect. |
| Applicant dashboard | Tracker-linked submission record with receipt, state, messages, and actions. |
| Admin submission table and dossier | Organization queue plus full scoped dossier. |
| Tags, notes, status history | Labels, internal notes, and append-only consequential history. |
| Reader assignment | Stage-specific assignment with workload, group, conflict, and expiry rules. |
| Score and review notes | Versioned review form with draft and final states. |
| Focused manuscript reader | Media-aware, accessible reviewer workspace. |
| Blind shortlist judging | Server-redacted blind projection with stable anonymous codes. |
| Longlist/shortlist/winner operations | Configurable stage advancement and per-Work decisions. |
| Status notification scripts | Previewed, recipient-specific, durable message batches. |
| CSV and dossier generation | Scoped, provenance-preserving exports. |

### 2.2 Arole code that must not be transplanted

- Hard-coded shortlist submission IDs.
- Hard-coded judge identities and email addresses.
- A single global `admin_session` cookie.
- Admin-side reviewer scoring that updates the first assignment.
- Prize-specific score-to-status thresholds.
- Applicant identity inside a type named `BlindManuscript`.
- One file URL stored directly on a Submission.
- One-organization assumptions.
- Fixed genres and a one-submission rule embedded in application code.
- A build command that runs `prisma db push --accept-data-loss`.
- Provider-specific storage calls inside business actions.
- Catch-all error handling returning internal exception messages to applicants.

### 2.3 Arole migration boundary

Wave 0 does not move real Arole applicant data. A future migration must begin
with counts and field/file/status/review maps, preserve original IDs and
timestamps as provenance, and run against an isolated test Organization before
any production import is authorized.

## 3. Submittable capability comparison

Official sources reviewed:

- Forms: <https://submittable.help/en/articles/4616135-what-are-the-different-form-types-available-in-my-organization-s-account>
- Form building: <https://submittable.help/en/articles/3620637-getting-started-step-1-building-forms>
- Assignments: <https://submittable.help/en/articles/924136-how-can-i-manually-assign-submissions-for-review>
- Review workflows: <https://submittable.help/en/articles/3693521-how-can-i-set-up-a-review-workflow-for-my-project>
- Multi-stage reviews: <https://submittable.help/en/articles/5139345-how-can-i-set-up-multi-stage-reviews>
- Roles: <https://submittable.help/en/articles/12386632-custom-roles>
- Reporting fields: <https://submittable.help/en/articles/5119056-available-data-for-reports>
- Portal branding: <https://submittable.help/en/articles/15853231-refresh-your-submission-portal-branding-with-look-and-feel>

| Capability | Submittable pattern | Missa decision |
| --- | --- | --- |
| Form families | Initial, eligibility, request, internal, additional, reference, and review forms | Match the family through one versioned form engine with purpose-specific policies. |
| Review workflow | Configurable stages, voting/custom form/no review | Match stages; add explicit conflict, blind-data, advancement, and correction rules. |
| Assignment | Manual, bulk, automatic, Team/Group assignment | Match; show workload and enforce program scope server-side. |
| Scoring | Hidden numeric scores and totals | Support transparent rubric calculation for authorized reviewers; never convert scores directly into decisions. |
| Roles | Granular capabilities and custom roles | Use capability grants plus resource scope; role names are presets. |
| Reporting | Field-level submission/review/report exports | Match with saved views and version-aware exports; minimize sensitive fields by default. |
| Branding | Logo, colors, fonts, header, button copy | Allow controlled semantic branding; prohibit arbitrary CSS/script and preserve accessibility. |
| Applicant account | One account tracks submissions across organizations | Reuse the Missa account, Tracker, Library, Inbox, and Calendar without forcing public Profile completion. |

### 3.1 Where Missa should be better

- Faster safe setup through editable vertical templates.
- One visible lifecycle with independent receipt, review, decision,
  communication, payment, and delivery lanes.
- Decisions and delivery attached to individual Works.
- Versioned application and review evidence.
- Explicit next action, owner, and due date.
- Source-backed Opportunity facts and deadline reconciliation.
- Reusable creator-owned Library material with immutable application snapshots.
- Server-enforced blind and scoped projections.
- Correction paths for decisions and messages.
- Portable exports that do not pretend to prove submission or delivery.

## 4. Canonical lifecycle contract

### 4.1 Configuration lifecycle

`draft → in-review → approved → published → superseded → archived`

- Only `published` versions accept new drafts.
- An application draft pins the published version it started against.
- A submitted packet permanently pins the form, policy, workflow, and public
  Opportunity versions applicable at finalization.
- Publishing a replacement creates a new version; it never edits historical
  evidence in place.

### 4.2 Application lifecycle

`not-started → draft → ready → payment-pending → submitted → amendment-open → withdrawn`

`ready` is derived from deterministic required-field and file rules. It is not
eligibility or likelihood of selection. `submitted` requires a committed packet
and durable receipt. Payment status remains a separate lane.

### 4.3 Receipt lane

`received | needs-attention | withdrawn`

This describes the packet, not its creative outcome.

### 4.4 Review lane

`not-started → assigning → in-review → review-complete`

`paused` and `blocked` are explicit operational overlays with reasons. A stage
advances only through an authorized manual action or a published deterministic
rule. Opening material never completes a review.

### 4.5 Review assignment lifecycle

`assigned → opened → draft-saved → finalized`

Alternative terminal states are `recused`, `revoked`, and `expired`. Reopening a
finalized review creates a visible revision and requires authorization.

### 4.6 Work decision lifecycle

`no-decision → draft → final`

A final decision may later become `corrected`; the correction is a new version,
not an overwrite. Allowed outcomes are initially `accepted`, `declined`, and
`waitlisted`. Vertical language is presentation, not separate stored status.

### 4.7 Communication lifecycle

`not-prepared → draft → ready → scheduled → sending → sent`

Failure states are `partly-sent`, `failed`, and `cancelled`. Provider acceptance
and delivered email are distinct evidence. A message pins the exact decision
version and rendered recipient content.

### 4.8 Delivery lifecycle

Each accepted Work may have multiple requirements:

`not-started → in-progress → blocked → complete`

Delivery begins only after a final acceptance. Completion needs explicit
evidence appropriate to the task and never follows automatically from a sent
decision message.

### 4.9 Payment lane

`not-required | pending | paid | waived | failed | disputed | refunded | unknown`

Currency and amount accompany monetary facts. Payment never changes eligibility,
review, or decision state implicitly.

## 5. Capability and scope matrix

`Allow` means the route must still prove the resource scope. `Assigned` means
only explicitly assigned records. `Projection` means a reduced server-authored
view, not a full record with fields hidden in CSS.

| Capability | Owner | Admin | Team admin | Program manager | Reviewer | Finance | Legal | Viewer | Guest reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Configure portal identity | Allow | Allow | No | No | No | No | Projection | Read | No |
| Create Team/Program | Allow | Allow | Scoped | No | No | No | No | Read | No |
| Configure Opportunity/forms | Allow | Allow | Scoped | Scoped | No | No | Projection | Read | No |
| Publish configuration | Allow | Allow | Configurable | Configurable | No | No | Approval projection | Read | No |
| View submission identity | Allow | Allow | Scoped | Scoped | Stage policy | No | Purpose-limited | Configurable projection | Stage policy |
| View applicant answers | Allow | Allow | Scoped | Scoped | Stage projection | No | Purpose-limited | Configurable projection | Stage projection |
| View files | Allow | Allow | Scoped | Scoped | Assigned projection | No | Purpose-limited | No by default | Assigned projection |
| Triage receipt | Allow | Allow | Scoped | Scoped | No | Payment projection | No | Read if granted | No |
| Assign reviewers | Allow | Allow | Scoped | Scoped | No | No | No | No | No |
| Complete review | If assigned | If assigned | If assigned | If assigned | Assigned | No | No | No | Assigned |
| View other reviews | Allow | Allow | Scoped | Scoped | Stage policy | No | No | Summary if granted | Stage policy |
| Draft decisions | Allow | Allow | Configurable | Configurable | No | No | Approval projection | Read if granted | No |
| Finalize decisions | Allow | Allow | Configurable | Configurable | No | No | Configurable approval | No | No |
| Prepare/send messages | Allow | Allow | Scoped | Scoped | No | No | Approval projection | No | No |
| View payment details | Allow | Allow | Configurable | Configurable | No | Projection | Contract-only | Aggregates if granted | No |
| Manage delivery | Allow | Allow | Scoped | Scoped | No | Payment tasks | Legal tasks | Read if granted | No |
| Export | Allow | Allow | Scoped | Scoped | Assigned review only | Finance schema | Legal schema | Explicit read schema | No |
| Manage members/roles | Allow | Allow | Scoped | No | No | No | No | No | No |

### 5.1 Required scope dimensions

Every protected projection or command evaluates:

1. account and active session;
2. organization membership;
3. capability grant;
4. Team scope;
5. Program scope;
6. Opportunity scope;
7. stage or assignment scope;
8. identity visibility policy;
9. answer/field visibility policy;
10. attachment visibility policy; and
11. record lifecycle state.

## 6. Configuration and versioning contract

### 6.1 Configuration aggregates

- `PortalConfiguration`: identity, support, locale, timezone, public policies,
  and controlled semantic brand values.
- `OpportunityConfiguration`: dates, limits, categories, eligibility,
  amendment, withdrawal, fee, and public-guideline policies.
- `FormDefinition`: purpose and ordered discriminated field definitions.
- `ReviewWorkflowDefinition`: ordered stages, assignment policy, blind policy,
  conflict policy, advancement rule, and review form version.
- `MessageTemplateDefinition`: purpose, locale, allowed placeholders, sender,
  subject, body, and approval policy.
- `DeliveryWorkflowDefinition`: accepted-Work task templates and visibility.

### 6.2 Version rules

- Versions are immutable after publication.
- Draft edits use optimistic concurrency.
- Publication validates the complete aggregate once at the boundary.
- References between published aggregates use version IDs, not mutable aliases.
- Applicant drafts pin versions at creation.
- Organizations may publish a new version for future drafts.
- A material change affecting an active draft produces a visible choice: remain
  on the pinned version when allowed, or migrate through an explicit comparison.
- Submitted packets never migrate.
- Rollback republishes a prior version as a new version; it does not reactivate
  or mutate the old row.
- Deletion is prohibited when a version has evidence references; archive it.

### 6.3 Field model direction

Use a discriminated union owned by the form domain. Each field variant contains
only relevant settings. Shared properties are `id`, `type`, `label`, `helpText`,
`required`, `visibility`, and `order`. File rules exist only on file fields;
choice options exist only on choice fields; word limits exist only on text
fields. Do not introduce a universal settings bag.

## 7. Audit and event requirements

### 7.1 Consequential audit events

Record at minimum:

- configuration created, submitted for review, approved, published, superseded,
  archived, and rollback published;
- draft created, recovered, migrated, and expired;
- upload accepted, rejected, replaced, and deleted;
- submission finalized, amendment opened/finalized, and withdrawn;
- receipt attention state changed;
- reviewer assigned, reassigned, recused, revoked, and notified;
- review draft saved, finalized, reopened, and revised;
- decision drafted, finalized, corrected, and overridden;
- message previewed, approved, scheduled, cancelled, attempted, delivered,
  bounced, complained, and retried;
- delivery task created, changed, evidenced, and completed;
- payment created, verified, failed, disputed, refunded, and waived;
- membership, capability, and resource scope changed;
- import previewed, approved, committed, reconciled, and rolled back where safe;
- export generated and downloaded.

### 7.2 Audit event shape

Each event needs:

- stable event ID and typed event name;
- actor account or explicit system actor;
- organization and affected resource scope;
- target type, target ID, and target revision;
- occurred-at time;
- correlation and causation IDs;
- human-readable reason for overrides/corrections;
- minimal non-secret metadata;
- linked command receipt; and
- customer-safe projection rules.

Do not store provider secrets, raw authentication data, full private files, or
unnecessary applicant answers in audit metadata.

## 8. Authority map

| Concern | Canonical owner |
| --- | --- |
| Public organization identity | Radar organization plus a published portal configuration version |
| Opportunity public facts and source evidence | Radar Opportunity |
| Organization-operated application configuration | Workspace published configuration versions |
| Creator identity/preferences/privacy | Profile |
| Reusable Works/files/answers | Library |
| Application packet and form snapshot | Workspace Submission |
| Creator relationship and reminders | Tracker |
| Review evidence | Workspace stage assignment and review version |
| Creative outcome | Workspace per-Work Decision |
| External communication evidence | Workspace message batch plus effect ledger |
| Accepted-Work obligations | Workspace Delivery |
| Provider delivery facts | Provider event ledger |
| Payment facts | Stripe reconciliation ledger |

## 9. Launch proof gates

### Gate A — Contract

- Lifecycle values and transitions have tests.
- Configuration references immutable version IDs.
- Every mutation has an authority owner.
- Capability and scope rules are executable, not prose-only.
- Applicant, Organization, reviewer, and provider evidence remain distinct.

### Gate B — Data and transactions

- Relational authority covers the complete vertical slice.
- Domain write, command receipt, audit event, and outbox event commit atomically.
- Idempotency reuse with a changed request is rejected.
- Optimistic concurrency conflicts return a recoverable response.
- Cross-tenant reads and writes fail without disclosing record existence.
- Backup restoration is rehearsed with submission attachments referenced.

### Gate C — Applicant journey

- A real account completes eligibility, draft, upload, save, restore, final
  review, submission, and receipt.
- The flow works on desktop, 390px, a physical iPhone, and a physical Android
  device.
- Refresh, session expiry, duplicate submit, slow upload, scan rejection,
  provider outage, and payment return are exercised.
- The final receipt matches the committed packet and Tracker state.

### Gate D — Organization journey

- Two organizations publish materially different portals without code changes.
- An operator finds, triages, routes, reviews, decides, communicates, and
  completes delivery for a real disposable submission.
- Team and Program scopes prevent broader access.
- Blind mode is verified from server responses and downloaded files.
- Concurrent assignment, review, and decision edits are exercised.

### Gate E — Providers

- Private storage access and expiry are certified.
- Malware scanner accepts a clean fixture and rejects a safe test signature.
- Stripe success, expiry, failure, refund, and dispute events reconcile.
- Resend acceptance, delivery, bounce, complaint, and retry evidence reconcile.
- Missing configuration fails closed without exposing provider details.

### Gate F — UX and accessibility

- Default, loading, empty, error, success, disabled, and permission states exist.
- Keyboard, screen reader, 200% zoom, long content, and reduced motion pass.
- No new design-system exceptions are introduced.
- `npm run check:design-system` passes.
- A first-time Organization operator publishes a safe portal without assistance.
- An occasional reviewer completes an assigned review without onboarding help.

### Gate G — Migration

- Arole and Submittable imports begin with a dry-run report.
- Counts, timestamps, source IDs, files, reviews, decisions, and messages reconcile.
- Unmatched identities and missing files remain explicit.
- Imported and native submissions obey the same authorization and lifecycle rules.
- Real data moves only after explicit approval.

## 10. Wave 0 completion ledger

- [x] Audit Missa's present submission schema and mutations.
- [x] Audit the Arole repository at a pinned commit.
- [x] Build the Arole-to-Missa capability map.
- [x] Build the official Submittable capability comparison.
- [x] Mark Missa capabilities reuse/harden/build/provider-certify.
- [x] Define the canonical lifecycle and independent state lanes.
- [x] Define the capability and resource-scope matrix.
- [x] Define configuration aggregates and version rules.
- [x] Define consequential audit-event requirements.
- [x] Define launch proof gates.

## 11. Wave 1 entry backlog

Do these tasks in order:

1. Convert the lifecycle rules into focused transition tests.
2. Define version identifiers and publication invariants.
3. Define `PortalConfiguration` as a precise domain type.
4. Define the form-field discriminated union.
5. Define `FormDefinition` and `FormVersion`.
6. Define `OpportunityConfigurationVersion`.
7. Define `ReviewWorkflowDefinition` and stage variants.
8. Define capability grants and resource-scope types.
9. Add additive relational migrations for configuration versions.
10. Add typed relational query projections required by the first slice.
11. Add transactional create/update/publish commands.
12. Add preview and rollback commands.
13. Create two fixture Organizations with different configuration data.
14. Build the smallest public portal projection.
15. Verify that no Organization-specific condition exists in feature code.

Wave 1 must begin with domain tests and additive migrations, not dashboard UI.

