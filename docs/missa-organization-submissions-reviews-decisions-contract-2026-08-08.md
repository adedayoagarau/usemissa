---
title: Missa Organization submissions, reviews, and decisions screen contract
version: "1.0"
status: selected-family-partially-promoted-to-local-product
date: "2026-08-08"
customer_language: Organization, Opportunity, Submission, Work, Review, Decision, Message, Delivery
product_promotion_status: read-only-product-surfaces-local-only-mutations-blocked
---

# Missa Organization submissions, reviews, and decisions screen contract

This contract defines the Organization operating experience from a received Submission through review, per-Work decisions, decision communication, and delivery handoff. It precedes premium component selection. A component is acceptable only if it preserves the lifecycle, permission, privacy, recovery, and taxonomy rules below.

The selected responsive family is now present in local Organization product routes for inventory, dossier, review evidence, and decision evidence. No production deployment is claimed. Review-assignment and decision mutations remain intentionally blocked until the capability, conflict, draft/final, concurrency, and communication gates in this contract are implemented.

## 1. What the user is trying to accomplish

### Intake operator

- See what arrived and whether the Submission can enter review.
- Find missing, unreadable, duplicate, withdrawn, unpaid, or disputed material.
- Route the Submission without making a creative judgment.
- Preserve the submitter's original Work, files, answers, and receipt history.

### Program manager or editor

- Understand the Opportunity, category, Work count, and review readiness.
- Create rounds, assign eligible reviewers, balance workload, and handle conflicts.
- See whether enough valid recommendations exist for each Work.
- Prepare decisions without accidentally communicating them.

### Reviewer

- See only assigned material and only the identity allowed by the review mode.
- Read or view Work and relevant answers beside the rubric.
- Disclose a conflict, save a draft, complete a valid recommendation, and recover from a failed save.
- Understand round context and deadline without seeing unrelated submissions or Organization operations.

### Decision maker

- Decide each Work independently.
- Understand missing review evidence, disagreement, overrides, and downstream consequences.
- Save a decision draft, review a packet summary, and confirm consequential changes.
- Correct a decision without silently contradicting a message already sent.

### Communicator

- Select an explicit, reviewable audience.
- Preview the actual message and recipient-specific result before sending.
- Send, schedule, retry only failed recipients, and see delivery state without provider jargon.
- Never communicate a draft or stale decision.

### Finance, legal, viewer, and guest reviewer

- Finance sees fee, payment, waiver, refund, award amount, and payment milestones only where authorized.
- Legal sees agreements, consent, rights, and approved decision-copy gates only where authorized.
- Viewer sees a read-only projection with no latent mutation controls.
- Guest reviewer sees only active assignments in the permitted round and cannot infer submitter identity, other reviewers, or Organization membership.

## 2. Customer-facing lifecycle model

One overloaded status is rejected. The interface must model these lanes independently.

| Lane | Customer-facing values | Ownership and rule |
| --- | --- | --- |
| Receipt | Received, Needs attention, Withdrawn | Describes the submitted package, completeness, payment and withdrawal—not creative outcome. |
| Review | Not started, Assigning, In review, Review complete, Review paused | Derived from rounds, assignments, conflicts, valid recommendations, and round policy. |
| Work decision | No decision, Draft decision, Accepted, Declined, Waitlisted | Stored per Work. A Submission with multiple Works never substitutes one packet decision for its Work outcomes. |
| Submission summary | No decisions, Partially decided, Accepted, Declined, Waitlisted, Partially accepted, Mixed, Withdrawn | Derived from active Work decisions. It is never directly imported or manually edited. |
| Communication | Not prepared, Draft message, Ready to send, Scheduled, Sending, Sent, Partly sent, Failed, Cancelled | Separate from decision state. Saving a decision does not send it. |
| Delivery | Not applicable, Not started, In progress, Blocked, Complete | Begins only for accepted Work and remains separate from the decision. |
| Payment | Not required, Pending, Paid, Waived, Failed, Disputed, Refunded, Unknown | Commercial fact. It does not imply eligibility, review readiness, or outcome. |

`Decided` is not used as a customer-facing terminal label because it hides the outcome and conflicts with the current derived summary behavior. `In review` must not be used as a generic processing state.

### Transition constraints

- Receiving a Submission does not start review automatically unless a visible Organization rule says so.
- A withdrawn Submission or Work is removed from active review and decision actions but remains in history.
- Completing a review requires a valid rubric/recommendation, not merely opening or submitting an empty form.
- A Work decision may be drafted before review completes only when the Organization's explicit policy allows it; finalization requires the named override permission and a reason.
- Accepted Work creates a delivery handoff only after the decision is final. It must not silently create or send a message.
- A communicated decision becomes a consequential record. Corrections require a visible correction path and a new communication state.
- Submission summary is recalculated after every Work decision, withdrawal, restoration, or decision correction.

## 3. Taxonomy and categorization boundary

Missa's canonical taxonomy remains twelve independent facets with stable IDs. These screens consume taxonomy; they do not reinterpret it.

- A Work may carry submitter-supplied or Organization-confirmed practice terms from the applicable creative facets.
- Opportunity practice rules describe what the call accepts. They are context for routing and review, not proof that a Work is eligible, high quality, or correctly classified.
- Opportunity type, submission category/path, eligibility, geography, fees, deadlines, source/trust, review state, and decisions remain separate domains.
- A broad parent and narrow descendant are not rendered as a wall of duplicate badges. The narrowest useful context is shown, with expansion for the full path.
- Unknown, deprecated, conflicting, and unmapped terms stay explicit. They are never coerced to “Other,” “eligible,” or a decision recommendation.
- Private identity, demographic, protected, reference, and confidential recommendation data are not treated as taxonomy and never appear in a generic filter.
- Reviewer routing may use an explicitly configured practice/category rule. It must never infer reviewer expertise or automate a decision from taxonomy similarity.
- Taxonomy changes after receipt preserve the term IDs and labels used at submission time; any migration is separately visible and auditable.

### Taxonomy shown by surface

| Surface | Default taxonomy exposure |
| --- | --- |
| Submission inventory | One useful category/practice summary only when it helps routing; no badge wall. |
| Submission dossier | Opportunity category and Work practice context, separated from eligibility and geography. |
| Reviewer queue | Only the category/practice context permitted by the round; identity-sensitive facets withheld in blind mode. |
| Decision desk | Work context plus review evidence; taxonomy never appears as a score or recommendation. |
| Messages and exports | Only fields explicitly included by the authorized template/export schema. |

## 4. Information architecture

### Organization destinations

- `/organization/[organizationId]/submissions` — operational intake inventory.
- `/organization/[organizationId]/submissions/[submissionId]` — Submission dossier with Works, answers, files, payment, review, decisions, messages, delivery, and history projected by capability.
- `/organization/[organizationId]/reviews` — rounds, assignment health, conflicts, workload, and completion.
- `/organization/[organizationId]/reviews/[roundId]` — one round's assignments and policy.
- `/organization/[organizationId]/decisions` — decision preparation and communication readiness.
- `/organization/[organizationId]/decisions/[batchId]` — a draft or sent decision batch with recipient-level state.
- `/reviews` — the signed-in person's cross-Organization reviewer queue. This is not placed under Profile because it is assigned work, not reusable identity.

Compatibility routes may redirect during migration, but customer navigation and headings use Organization—not Workspace.

## 5. Submission inventory contract

### First viewport

- Organization and scoped role.
- “Submissions” H1 and a concise description of the current Opportunity/program scope.
- Search across public submitter display name where allowed, Work title, Opportunity title, and explicitly searchable answers. Internal IDs are not search copy.
- Quick filters for attention, Opportunity, receipt, review, decision summary, and payment when the role may see it.
- A stable result count, URL-backed sort/filter state, and saved views where available.
- One primary action appropriate to the role; export and import remain secondary and permission-gated.

### Inventory row

Each row answers:

1. What Submission or Work is this?
2. Which Opportunity/category does it belong to?
3. What requires attention now?
4. Where is it in receipt, review, and decision lanes?
5. Who owns the next action?
6. When is that action due?

The row does not expose raw Submission IDs, audit IDs, request keys, source confidence, freshness, worker state, or provider state.

Desktop may use a table when column comparison is useful. At narrow widths it becomes a labelled list row and focused detail page; it does not squeeze the desktop table or hide consequential state in horizontal scroll.

### Selection and bulk action

- Selection scope is explicit: this page, all results matching the current filter, or manually selected rows.
- The selected count remains visible when filters, sort, or pagination change.
- Bulk assign, export, message preparation, and permitted receipt changes show eligibility before confirmation.
- Mixed selections are partitioned into eligible and ineligible records with reasons.
- Bulk decision is not a generic toolbar action. It uses a dedicated per-Work review screen, explicit outcome, consequence summary, and confirmation.
- Partial failure preserves successful records, identifies failed records in customer language, and offers retry only for the failed subset.

## 6. Submission dossier contract

The dossier is one coherent record, not nested cards for every object.

### Persistent context

- Opportunity, category, receipt time, submitter display according to identity policy, and independent lane summaries.
- Previous/next navigation preserves the originating inventory query and selection.
- An urgent consequence appears before descriptive metadata.

### Sections

- Overview: receipt, attention, category, relevant eligibility facts, payment summary, and next action.
- Works: one section per Work with title, practice context, files/links, withdrawal state, review summary, and decision.
- Answers: original answers and approved amendments with provenance.
- Files: safe filename, type, size, scan/availability state, and version; never require download merely to identify material.
- Reviews: rounds, assignment state, valid recommendation summaries, conflicts, and permitted comments.
- Decisions: per-Work drafts/final outcomes and packet summary.
- Messages: user-facing communication history and replies.
- Delivery: accepted-Work tasks only.
- History: human-readable consequential events; internal request and audit identifiers remain internal.

Blind mode removes identity from reviewer projections and redacts identity-bearing answers/files by policy. It is a server projection, not CSS hiding.

## 7. Review operations contract

### Round overview

- Name, Opportunity, policy, deadline, review mode, rubric version, assignment progress, conflict count, and completion rule.
- Counts are actionable: Unassigned, Assigned, In progress, Submitted, Conflict, Overdue, and Removed.
- Aggregate score, median, disagreement, or consensus appears only when the rubric and Organization policy make it meaningful. It never creates an automatic decision.

### Assignment

- Search only eligible reviewers in scope.
- Show relevant expertise only when it is explicit Organization/member data.
- Show current workload, active conflict, removed/suspended membership, and round eligibility.
- Prevent duplicate active assignment to the same reviewer/Submission/round.
- Support remove/reassign with consequence copy; preserve completed recommendation history.
- Random or balanced assignment requires a preview and deterministic eligibility policy before commit.

### Reviewer experience

- Queue rows show Organization, Opportunity, round, Work count, deadline, progress, and conflict action.
- The review page uses a side-by-side reading/review composition on wide screens and a deliberate Work/rubric switch on narrow screens.
- Draft is local/server recoverable and visibly distinct from submitted review.
- Submit validates every required rubric criterion and allowed score range.
- Conflict declaration removes access according to policy and alerts the manager without revealing inappropriate detail.
- Reopening or replacing a recommendation is permissioned and recorded; concurrent changes do not silently overwrite.

## 8. Decision contract

### Decision preparation

- The unit of decision is Work.
- The desk shows Work, Opportunity/category context, review completion, permitted recommendation evidence, conflict/disagreement, current outcome, and communication state.
- Supported current outcomes are Accepted, Declined, and Waitlisted until the domain model intentionally expands. Strategy outcomes such as Shortlisted, Finalist, Winner, Deferred, or Revision requested are not decorative UI options before backend support.
- Outcome selection changes a draft. It does not POST a final decision immediately.
- A final action summarizes affected Works, review-policy exceptions, delivery tasks to be created, and whether any prior message exists.
- Concurrent decision changes stop finalization and offer a current-versus-draft comparison.

### Multi-Work summary

- No Work decided → No decisions.
- Some active Works decided → Partially decided.
- All active Works share one outcome → that outcome.
- At least one accepted and at least one other outcome or undecided Work → Partially accepted.
- All active Works decided with different non-accepted outcomes → Mixed.
- Withdrawn Works remain visible but are excluded from the active summary unless policy says the whole Submission is withdrawn.

### Correction

- Before communication: an authorized user can revise the decision draft/final record with a reason.
- After communication: the interface requires a correction record and a new recipient communication; it never edits history in place.
- Removing an acceptance cannot silently delete delivery work already begun.

## 9. Decision communication contract

- Messages begin from a frozen decision snapshot and explicit recipient projection.
- Preview shows subject, body, sender identity, reply destination, recipients, conditional branches, missing variables, and Work outcomes.
- A recipient with no valid address or unresolved outcome is excluded with a visible reason.
- Sending to many people requires a typed permission and final confirmation naming count, Opportunity, outcome groups, and schedule.
- Scheduled messages can be cancelled until processing begins.
- Partly sent batches retain recipient-level Sent, Failed, or Not sent states and retry only the failed/not-sent subset.
- UI language says “Could not send,” “Try failed recipients again,” or “Sender setup needs attention”—not provider history, idempotency key, queue, worker, or batch UUID.
- The Submission dossier reflects communication state without claiming a submitter read the email unless a supported receipt exists.

## 10. Role and capability projection

Role names are not authorization. The server returns capabilities and the exact data projection.

| Capability | Owner | Program manager/editor | Reviewer | Finance | Legal | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| View scoped Submissions | Yes | Scoped | Assigned projection only | Payment projection | Agreement projection | Read-only scoped |
| See submitter identity | Policy | Policy | Only non-blind policy | Only if required | Only if required | Policy |
| Assign reviewers | Yes | Scoped | No | No | No | No |
| Submit recommendation | No by default | If assigned | Assigned only | No | No | No |
| Draft/finalize decision | Yes | Scoped permission | No | No | Approval only if configured | No |
| Prepare/send decision message | Yes | Scoped permission | No | No | Approve copy only if configured | No |
| Export | Explicit | Explicit scoped | Own packet only if allowed | Finance schema only | Legal schema only | Explicit read-only schema |

Foreign Organization IDs and inaccessible records use a non-enumerating unavailable state. Navigation does not show destinations the capability projection excludes.

## 11. Empty, loading, unavailable, and recovery states

- Empty Organization: explain how to publish an Opportunity before expecting Submissions.
- Empty filtered result: preserve filters and offer clear/reset; do not show a create-Submission CTA.
- No review round: explain the prerequisite and who can create one.
- Reviewer caught up: show next deadline and completed count without gamified metrics.
- No decisions ready: explain whether reviews, permissions, or policy block preparation.
- Loading: preserve page structure and labels; never flash unauthorized data.
- Backend unavailable: keep the last confirmed read-only state where safe, label it unavailable, and disable consequential writes.
- Failed save: preserve user edits and focus the actionable error summary.
- Interrupted request: check result before offering a retry for assignment, decision finalization, or sending.
- Concurrent edit: compare current and attempted values; never last-write-wins silently.
- Session expiry: preserve non-sensitive drafts locally where policy permits, require sign-in, then restore context.

## 12. Required edge-case fixture matrix

The local comparison must represent these fixtures before a direction is approved.

### Intake and inventory

1. No Opportunities; no Submissions; one Submission; 10,000 Submissions.
2. New receipt, unreadable file, missing required file, unavailable file, very long filename, many files, external media link.
3. Duplicate/replayed submission, duplicate Work title, amended answer, revised file.
4. Paid, waived, pending, failed, disputed, refunded, and unknown payment.
5. Whole Submission withdrawn; one Work withdrawn while others remain active; withdrawal during review; withdrawal after decision.
6. Long Organization/Opportunity/Work/submitter names; no optional image; extreme image; many collaborators.
7. Imported unmatched account, unknown category, duplicate row, invalid status, 2 MB/2,000-row limit, partial import, interrupted import.
8. Current imported terminal Submission status without Work decisions—rendered as an integrity issue, never as a trustworthy outcome.

### Taxonomy and policy

9. One practice term, broad and narrow terms, large selection, deprecated term, unknown term, conflicting terms.
10. Opportunity/Work category mismatch, explicit approved exception, unmapped legacy category.
11. Eligibility conflict, geography conflict, deadline conflict, and fee conflict kept separate from taxonomy.
12. Blind, double-blind, and identity-visible rounds; identity-bearing filename/answer requiring redaction.

### Assignment and review

13. No round, draft round, active round, paused round, complete round, reopened round, and multiple rounds.
14. No reviewer, one reviewer, multiple reviewers, duplicate assignment attempt, removed reviewer, suspended reviewer, reviewer outside scope.
15. Balanced workload, overloaded reviewer, due today, overdue, no deadline.
16. Declared conflict, suspected conflict, conflict after draft, manager reassignment.
17. Empty rubric, invalid score, required criterion missing, draft saved, save failed, submitted, reopened, concurrent review.
18. Missing recommendations, unanimous recommendations, split recommendations, large disagreement, comments hidden by policy.

### Decisions and messages

19. One Work, many Works, all same outcome, partially decided, partially accepted, mixed, all withdrawn.
20. Decision with complete review, incomplete review, explicit override, missing permission, stale review, concurrent decision.
21. Final decision not messaged, message drafted, ready, scheduled, sending, sent, partly sent, failed, cancelled.
22. Missing recipient, duplicate recipient, invalid sender, missing template variable, conditional branch mismatch, reply received.
23. Decision correction before send, correction after send, delivery already started, acceptance replaced by waitlist.
24. Bulk selection on one page, all filtered results, mixed eligibility, selection changed by filter, partial failure, interrupted commit, replay.

### Access and viewport

25. Owner, scoped program manager, editor, assigned reviewer, guest reviewer, Finance, Legal, Viewer, removed member, and foreign Organization.
26. 320px, 390px, tablet, laptop, wide desktop, 200% zoom-equivalent reflow, keyboard-only, reduced motion, and screen-reader landmarks.
27. Offline/transient failure, stale cached read, session expiry, focus restoration after dialog/sheet, and browser Back preserving inventory state.

## 13. Accessibility and responsive behavior

- One H1 and one main landmark per route; named Organization and local workflow navigation.
- Skip link precedes repeated chrome.
- Tables use real headers and row labels. Opening a record uses a real link or button, never a clickable `<tr>`.
- Status is conveyed by text, not color alone. Aubergine is not reused for every state; Lichen, Ochre, and Mineral Blue keep their semantic meanings.
- Inputs retain visible labels, descriptions, and error associations. Validation moves focus to an error summary and links to fields.
- Dialogs and sheets have a name, initial focus, focus trap, Escape where safe, and focus return. A send already processing cannot be dismissed as though cancelled.
- Touch targets are at least 44px on mobile. Dense desktop rows expand rather than preserve compact controls on touch.
- Reviewer Work and rubric have one scroll owner per region; mobile never creates two nested scroll traps.
- Virtualized rows preserve accessible position/count and keyboard behavior if large-volume performance requires virtualization.
- Reduced-motion users receive no essential state through animation alone.

## 14. Current-state findings that block promotion

The current implementation establishes useful domain foundations, including per-Work `Decision`, tenant-scoped detail reads, self-scoped reviewer assignments, decision idempotency, and partial send reporting. It is not yet safe to promote a redesigned shell because:

- current pages often select the first Organization membership rather than a stable Organization route/context;
- the shell exposes the same destinations to roles with materially different permissions;
- status filters omit several current domain values and mix packet/Work state;
- the Submission card finalizes a decision from an immediate select change with no draft, confirmation, concurrency comparison, or communication consequence;
- reviewer assignment permits duplicate assignment and lacks explicit conflict/removal behavior;
- review completion accepts an unvalidated/empty recommendation and score range is not enforced;
- current review and decision pages expose internal IDs and insufficient Opportunity/round/deadline context;
- the imported `status` field can directly set a terminal Submission status without creating per-Work Decisions, allowing the summary, messages, and delivery state to contradict each other;
- message UI exposes internal batch/audit language but omits the recipient-level preview and recovery the user needs;
- blind-review protection is not yet proven as a server-authored field/file projection;
- broader strategy outcomes are not represented in the current domain and must not be offered as decorative options.

## 15. Promotion gates

Before a local direction can replace product routes:

1. Server-authored Organization context and typed capability projection.
2. A query model that returns independent receipt, review, Work decision, communication, delivery, and payment lanes.
3. Migration/repair for imported terminal Submission statuses without Work Decisions; future import may not write derived terminal status directly.
4. Review assignment uniqueness, membership eligibility, removal/reassignment, conflict, deadline, and rubric-version rules.
5. Validated rubric criteria and score ranges with draft/submitted/reopened/concurrent states.
6. Draft/final Work-decision model with optimistic concurrency, policy overrides, correction history, and deterministic packet summary.
7. Decision-message snapshots, recipient-level state, schedule/cancel/retry behavior, and typed permission gates.
8. Blind/double-blind server projections for identity, answers, filenames, files, comments, and exports.
9. Stable URL filters, selection semantics, large-list performance, and recovery behavior.
10. Authenticated tenant, role, keyboard, screen-reader, mobile, zoom, reduced-motion, and failure-path QA.
11. Explicit approval of the selected local visual direction and a separate product-promotion decision.

Until these gates are met, premium components remain review-library anatomy and the comparison remains non-production.
