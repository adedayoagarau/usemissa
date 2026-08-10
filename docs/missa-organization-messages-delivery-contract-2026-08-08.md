# Missa Organization Messages and Delivery contract

Date: 8 August 2026

Status: Option 2 implemented as local read-only Organization projections; no mutation or production promotion

## 1. Product boundary

This family begins after an Organization has recorded a per-Work decision. It covers two related but distinct jobs:

- **Messages** is the durable correspondence record: prepare, approve, send, correct, and understand the state of each recipient.
- **Delivery** is the accepted-Work fulfillment record: make each obligation explicit, assign it, resolve blockers, and preserve evidence of completion.

Messages is not a social inbox or a chat substitute. Delivery is not proof that an email, payment, publication, agreement, or external handoff happened. The two surfaces may link to each other, but they never collapse communication state and fulfillment state into one ambiguous status.

The customer-facing vocabulary is Profile, Opportunities, Tracker, Library, and Organization. `Workspace`, `Passport`, `Radar`, provider names, queue identifiers, worker state, confidence, and freshness are not rendered.

## 2. Current implementation truth

Repository inspection found:

- decision email preview and send are admin-only compatibility routes;
- templates currently support only `workTitle` and `outcome`, and unknown variables disappear silently;
- a send may skip missing Works, decisions, or recipient addresses without a recipient-facing reason;
- sends are capped at 100 Work IDs by truncation;
- the additive provider-effect ledger records attempts and `pending`, `sending`, `sent`, `failed`, or `suppressed`, but it is an operational effect ledger rather than a complete Organization correspondence model;
- the visible Messages page derives batches from audit entries and exposes implementation details instead of message content, recipients, correction history, or replies;
- Delivery currently permits one generic `pending | complete` task per accepted Work, with an optional date and no title, assignee, task type, dependency, evidence, agreement, asset, or payment model;
- current protected mutations treat owner/admin as the elevated compatibility capability even though the Organization role domain also includes team admin, program manager, reviewer, finance, legal, viewer, and guest.

The selected local implementation now adds `/organization/[id]/messages` and `/organization/[id]/delivery` as owner/admin read-only projections. Messages exposes only durable batch and recorded-recipient facts; Delivery derives its inventory from accepted per-Work Decisions and the compatibility task record. Unsupported sender copy, approval, exclusion, reply, external receipt, owner, evidence, agreement, asset, payment, and dependency claims remain visibly unavailable. Other roles receive a withheld-scope explanation until Team, Program, Legal, and Finance projections are enforced by the server.

Therefore, the local review UI may model the intended contract, but unsupported states must be labelled as design fixtures. It must not imply those capabilities are already connected.

## 3. People and objectives

| Person | Primary objective | Boundary |
| --- | --- | --- |
| Program manager | Prepare outcome correspondence and coordinate accepted-Work obligations | Cannot infer delivery or payment from an email send |
| Team admin | Configure templates, sender identity, approvals, and team access | Cannot read private review notes unless separately authorized |
| Legal | Approve terms, rights language, and agreements | Sees only the Work and correspondence needed for legal review |
| Finance | Confirm award amount, payment requirements, and payout state | Does not need private artistic review content |
| Reviewer | Read only the outcome context explicitly shared with reviewers | Cannot send decisions or manage fulfillment by default |
| Viewer | Inspect permitted Organization records without mutation | No send, approve, assign, or complete actions |
| Submitter | Receive clear correspondence and complete requested next steps | Internal notes and staff-only state never cross the boundary |

## 4. Screen architecture

### `/organization/[id]/messages`

Primary question: **What communication needs attention, and what exactly happened for each recipient?**

Required regions:

1. role-aware Organization navigation;
2. attention summary using named states rather than decorative metrics;
3. message ledger with subject, purpose, Opportunity, audience, sender, planned/sent time, and aggregate state;
4. selected message dossier with decision snapshot, approved content, recipient scope, and correction relationship;
5. recipient ledger with an explicit reason for every excluded, failed, or unresolved recipient;
6. internal notes visually and semantically separated from external copy;
7. visible recovery for partial sends, invalid addresses, stale previews, missing approval, and provider interruption.

### `/organization/[id]/messages/[messageId]`

Primary question: **Can I trust this message record, and what may I safely do next?**

The page owns the durable snapshot of subject/body/template version, sender/reply-to, audience rule, selected Works and outcomes, recipient resolution, approvals, schedule with timezone, send attempts, correction chain, and replies. Provider IDs and raw failures remain operational details unless translated into a safe action.

### `/organization/[id]/delivery`

Primary question: **Which accepted Works have an unresolved obligation, blocker, or due date?**

Required regions:

1. accepted-Work inventory ordered by consequence, not by a generic percentage;
2. next obligation, owner, due date/timezone when relevant, blocking reason, and task-group state;
3. explicit separation between agreement, materials, finance, publication/program, and external handoff;
4. mobile list/detail alternative rather than a compressed wide table;
5. empty, unconfigured, partial, overdue, blocked, complete, cancelled, and permission states.

### `/organization/[id]/delivery/[workId]`

Primary question: **What must happen for this accepted Work, who owns it, and what proves completion?**

The detail preserves the decision snapshot, acceptance state, vertical-specific plan, task history, evidence or external confirmation, and links to relevant correspondence. A task completion is not automatically an agreement signature, payment, publication, or provider delivery receipt.

## 5. Canonical state model

### Message

`draft` → `needs approval` → `approved` → `scheduled` or `sending` → `sent`, `partly sent`, or `failed`

Additional terminal or relationship states: `cancelled`, `superseded`, `corrected`.

### Recipient

`excluded`, `missing address`, `invalid address`, `ready`, `queued`, `sent`, `delivered`, `bounced`, `failed`, `suppressed`.

`Sent` means the provider accepted the handoff. `Delivered` is shown only when a provider receipt exists. An open or click is never required to prove that a decision was communicated.

### Reply

`no reply`, `reply received`, `answered`, `closed`.

### Delivery plan

`not created`, `ready to set up`, `active`, `blocked`, `complete`, `cancelled`, `not required`.

### Delivery task

`not started`, `in progress`, `blocked`, `complete`, `waived`, `cancelled`.

Task state is independent from message, agreement, asset, and payment state.

### Agreement, asset, and payment

- Agreement: `not required`, `draft`, `sent`, `signed`, `declined`, `expired`.
- Asset: `not requested`, `requested`, `received`, `needs revision`, `approved`.
- Payment or award: `not applicable`, `amount pending`, `approved`, `scheduled`, `paid`, `failed`, `disputed`, `refunded`.

The UI may summarize these lanes, but it must retain the source state and actor/time history behind every consequential transition.

## 6. Taxonomy and vertical adaptation

The 12 canonical taxonomy facets describe the Opportunity and Work. They do not become workflow status, recipient eligibility, agreement terms, payment state, or fulfillment proof.

- Opportunity type may select a delivery-plan template.
- Practice and medium may determine requested assets only when the Organization explicitly configures that rule.
- Eligibility and geography may define a lawful audience rule, but the resolved recipient list must be previewed and frozen before approval.
- Fee and award facts remain separate from payment execution.
- Source and trust metadata do not appear on these customer screens.

Vertical labels adapt without changing the core model:

| Opportunity context | Delivery language |
| --- | --- |
| Magazine or journal | Publication plan, agreement, final manuscript, bio, headshot, proof, publication date |
| Grant | Award agreement, payment setup, compliance documents, reporting dates |
| Award or contest | Winner packet, prize fulfillment, announcement, certificate or press assets |
| Film festival | Selection agreement, screening file, laurels, schedule, filmmaker details |
| Residency or fellowship | Acceptance packet, travel, accessibility needs, agreement, stipend, onboarding |
| Conference | Speaker confirmation, session schedule, bio, headshot, slides, program listing |
| Accelerator | Offer, founder documents, interviews, cohort onboarding, CRM handoff |

## 7. Required interaction contract

- Preview resolves every template variable and blocks approval on unknown or missing required values.
- Preview and send share a decision/audience snapshot. A changed decision, withdrawal, address, or audience rule invalidates the send until reviewed again.
- Large audiences are counted and paginated; they are never silently truncated.
- Approval records who approved which immutable version.
- Scheduling always shows date, time, and timezone and handles past time and daylight-saving changes explicitly.
- Each send has an idempotency boundary and a per-recipient record. Retrying sends only unresolved recipients unless a deliberate resend is approved.
- Corrections reference the original message, explain the changed fact, and preserve both records.
- Internal notes cannot be copied into the external message by an ambiguous control.
- Completing a delivery task requires the configured evidence or an explicit “no evidence required” rule.
- Block, waive, cancel, reopen, and change-owner actions require a reason where their consequence warrants it.
- Concurrent edits stop and reload the current record; no last-write-wins outcome is presented as safe.
- Keyboard focus returns to the invoking control after dialogs and sheets close.
- On mobile, primary actions remain visible without hiding unresolved states or depending on hover.

## 8. Adversarial fixture matrix

### Messages

- no messages; one draft; thousands of recipients;
- no sender, reply-to, recipient address, or approved template;
- unknown merge field, conditional branch mismatch, very long name/title, diacritics, multilingual copy, and right-to-left content;
- mixed outcomes within one Submission;
- one Work withdrawn after preview; decision changed after approval; recipient edited after scheduling;
- duplicate recipient across Works; one person with several Works; one Work with several approved contacts;
- invalid, bounced, suppressed, and unsubscribed addresses, while transactional/legal obligations remain distinct from marketing preference;
- partial send, interrupted retry, duplicate request, delayed provider acknowledgement, provider unavailable, and missing durable ledger;
- correction after a wrong outcome, correction before the original finishes sending, and correction limited to affected recipients;
- scheduled time in the past, daylight-saving ambiguity, sender-domain failure, attachment unavailable, and reply received after the thread was closed;
- Program manager, Legal, Finance, Reviewer, Viewer, and foreign-Organization projections;
- session expiry, offline interruption, 320px viewport, 200% zoom, and keyboard-only completion.

### Delivery

- no accepted Works; accepted decision without a plan; one legacy generic task;
- one Submission with accepted, declined, waitlisted, and withdrawn Works;
- no due date, overdue date, timezone-sensitive event, dependency due after its child, and owner removed from the Organization;
- agreement not required, unsigned, declined, or expired;
- asset missing, too large, unsafe, wrong format, revision requested, or received outside Missa;
- award amount pending, payment held, paid outside Missa, payout failed, disputed, or refunded;
- task blocked, waived, cancelled, completed without evidence, reopened, or changed concurrently;
- vertical-specific plans with absent optional lanes and custom Organization tasks;
- one submitter responsible for several accepted Works and one Work owned by several staff roles;
- read-only role, cross-tenant URL, missing file permission, expired session, offline save, 320px viewport, 200% zoom, and keyboard-only task review.

## 9. Premium anatomy selected for local review

Premium references supply anatomy, not product truth:

- compact data-table/list rows for the message ledger and accepted-Work inventory;
- list/detail split panes with a full-page mobile detail fallback;
- explicit badge and alert families for aggregate and recipient states;
- labelled form, textarea, combobox, date/time, and confirmation-dialog anatomy;
- a structured task list with owner, due date, state, and evidence action;
- anchored popover/sheet only for supplementary filters or mobile context.

Rejected as defaults: chat bubbles, social inbox chrome, Kanban-only fulfillment, generic percentage progress, hover-only controls, animated marketing cards, provider dashboards, and any card that calls `sent` or `complete` external proof.

## 10. Promotion blockers

Product promotion remains blocked until implementation supplies:

1. durable message, immutable content-version, audience-snapshot, recipient, approval, schedule, correction, and conversation models;
2. validated merge fields and conditional content;
3. decision/audience concurrency checks and a non-truncating bulk-send contract;
4. provider-effect reconciliation, bounce/suppression policy, and safe retry semantics;
5. typed Organization capabilities for compose, approve, send, legal, finance, assign, and complete;
6. a per-Work delivery-plan and multi-task schema with type, title, owner, dates, state, dependency, reason, evidence, and optimistic concurrency;
7. explicit agreement, asset, payment, and external-handoff models where those lanes are offered;
8. audit-safe customer projections that omit provider and internal operation details;
9. mobile, keyboard, screen-reader, permission, cross-tenant, interruption, and recovery regression coverage;
10. explicit approval to promote the family beyond `/design-system/*`.

## 11. Acceptance criteria for the local family

- Option 2, **Outcome desk**, is the selected direction.
- Messages and Delivery can be reviewed independently from one route.
- All three directions remain available for comparison; the selection does not erase the alternatives.
- The selected direction works at 320, 390, 768, 1280, and 1536 CSS pixels without page-level horizontal overflow.
- Every interactive control has an accessible name and a 44px mobile target.
- State never relies on color alone.
- Partial send, stale preview, mixed Work, no due date, overdue, blocked, legal, finance, and Viewer fixtures are visible.
- No customer-facing freshness, confidence, source-health, provider, queue, worker, or raw identifier language appears.
- The two canonical local product routes are read-only; no message or Delivery mutation, API, schema, or production deployment is changed.
