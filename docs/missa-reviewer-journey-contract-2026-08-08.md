---
title: Missa reviewer journey contract
version: "1.0"
status: option-2-bounded-local-product-routes
date: "2026-08-08"
customer_language: Review, Assignment, Opportunity, Organization, Work, Recommendation
product_promotion_status: blocked
review_route: /design-system/reviewer-directions
selected_direction: option-2-evidence-desk
selected_review_route: /design-system/reviewer
---

# Missa reviewer journey contract

This contract defines the focused experience for a person invited to review assigned creative work. It precedes visual selection. A premium pattern is acceptable only when it preserves assignment scope, blind-review policy, evidence, rubric semantics, interruption recovery, conflict handling, and a deliberate final submission.

The selected local composition now also exists at canonical `/reviews` routes. It remains a bounded, non-deployed implementation and does not claim that the missing reviewer workflow contracts exist.

## 1. User and objective

The reviewer is an occasional, task-focused collaborator. They may review for more than one Organization and should not need to understand Missa’s Organization administration.

They need to:

1. see only their active and historical assignments;
2. understand the Organization, Opportunity, round, review mode, deadline, Work count, and completion rule;
3. read or view every permitted Work, answer, and file without losing the rubric;
4. disclose a conflict before exposing material beyond policy;
5. save a private review draft and safely resume across interruption or device change;
6. complete each required rubric criterion with its actual scale and guidance;
7. review the exact recommendation the Organization will receive;
8. submit once, understand whether editing is closed, and recover from ambiguous outcomes;
9. revisit a submitted review only when an authorized reopen creates a new revision.

The primary action changes by state: **Open assignment**, **Save draft**, **Review recommendation**, then **Submit review**. Conflict is always available but never visually competes with ordinary progress.

## 2. Current implementation truth

The current local product implementation provides:

- a canonical `/reviews` queue and `/reviews/[assignmentId]` focused Evidence Desk;
- `/reviewer` as a compatibility redirect;
- a server-built reviewer projection filtered by signed-in account ID;
- Organization, Opportunity, round, and Work-title context derived without exposing submitter identity;
- direct assignment ownership checks that return 404 for foreign and missing IDs;
- an explicit Work/Review switch below the wide-pane minimum;
- completed fixed numeric recommendations as clearly labelled read-only legacy records;
- no score, note, save, submit, edit, or resubmit control while the real rubric/draft/receipt contract is absent.

The compatibility reviewer API still returns the complete internal Submission object and Works rather than the new page projection. The current domain does not model due date, review mode, blind-field policy, rubric definition/version, required criteria, review draft, conflict, removed assignment, reopen, revision, optimistic concurrency, idempotency, or an immutable submitted recommendation. Score and note limits are not validated by the compatibility POST, and another POST silently replaces a completed recommendation. For that reason the canonical pages do not call or expose those unsafe mutation controls.

These are product-promotion blockers. The local design represents the target contract but does not imply that the backend already supports it.

## 3. Route and shell model

- `/reviews` is the target cross-Organization assignment queue for the signed-in person.
- `/reviews/[assignmentId]` is one focused assignment workspace.
- Compatibility `/reviewer` may redirect to `/reviews` during migration.
- The reviewer shell contains only Reviews, permitted Inbox updates, help, and personal account controls. It does not expose Organization owner/admin navigation.
- Returning from an assignment restores queue filter, sort, page, and focused row.
- Direct URL access is authorized against the assignment on every request; an unassigned, removed, or expired assignment returns a customer-safe unavailable state without leaking existence or identity.

## 4. Assignment lifecycle

| State | Meaning | Allowed reviewer action |
| --- | --- | --- |
| Assigned | Access granted; review not started | Open, declare conflict |
| In progress | Draft exists or permitted material was intentionally opened | Continue, save, declare conflict |
| Draft saved | Latest revision is durable | Continue, review recommendation |
| Due soon / Overdue | Deadline context, not a separate recommendation state | Continue if policy allows; otherwise read deadline closure |
| Conflict declared | Reviewer recused under policy | Read acknowledgement; no Work/rubric access unless policy explicitly retains it |
| Submitted | Immutable recommendation revision received | Read receipt; no editing |
| Reopened | Authorized new revision requested | Review previous submission, edit new draft, resubmit |
| Removed | Assignment access withdrawn | Read safe explanation; no material or recommendation access |
| Closed | Round no longer accepts reviews | Read prior receipt or closure explanation |

Opening a queue row does not itself mean In progress unless policy treats Work disclosure as a consequential start. A submitted review is not silently editable.

## 5. Reviewer projection and blind mode

- The server builds a reviewer-specific projection from the assignment, round policy, Submission, Works, answers, and files.
- Blindness is data removal, not CSS hiding. Submitter name, email, account ID, Profile, filenames, answer fields, embedded metadata, and Work taxonomy are withheld when the policy says they can identify the submitter.
- Every visible identity element is allowlisted by review mode: open, single-blind, double-blind, or policy-specific.
- Download and preview URLs are short-lived, assignment-scoped, and reauthorized.
- Other reviewers’ identities, drafts, notes, recommendations, and aggregate scores remain hidden unless the round’s explicit staged policy permits them after submission.
- The queue never exposes unrelated submissions, Organization membership, private Profile preferences, Tracker records, payment details, or internal IDs.
- A file or answer that cannot be safely redacted is withheld with a literal explanation; Missa does not silently present an incomplete packet as complete.

## 6. Evidence and Work reading

- One Submission may contain multiple Works. The assignment states whether the reviewer completes one recommendation for the packet, one per Work, or both.
- Work navigation preserves reading position and draft answers.
- Files identify safe filename, format, size, page/duration where available, and accessibility alternative. Provider URLs, scan engines, and storage paths remain internal.
- Images, audio, video, PDFs, text, links, and unavailable files have distinct accessible viewers or download fallbacks.
- A reviewer can report a broken or inaccessible file without declaring a personal conflict.
- Organization-authored questions and answers are grouped by rubric relevance; identity-sensitive answers remain omitted in blind mode.
- Taxonomy shows only the small category/practice context permitted by the round. It never appears as fit, score, expertise proof, or recommendation.
- Source freshness, source confidence, discovery state, and customer Profile data never appear.

## 7. Rubric contract

The target rubric is immutable and versioned for an active round. Each criterion has:

- stable criterion ID and rubric-version ID;
- title, guidance, required/optional state, and display order;
- response type such as bounded score, structured choice, short note, or long note;
- explicit scale labels and valid range when scored;
- visibility policy for reviewer, review team, decision maker, and submitter;
- an associated error and summary anchor;
- a plain explanation of how, or whether, the criterion contributes to an aggregate.

Stars, generic ratings, and unlabeled 1–10 inputs are rejected. A numeric score is meaningful only with named anchors and Organization-authored guidance. Rubric version cannot change silently after an assignment begins.

Overall recommendation is a separate structured choice such as **Recommend**, **Consider**, or **Do not recommend** only when the round defines those values. It is not inferred from scores. Reviewer notes are private to the named audience and have visible character limits.

## 8. Draft, conflict, and concurrency

- Review responses autosave to an owner/assignment-scoped server draft with a visible state: Saving, Saved, Offline changes waiting, Save failed, or Conflict needs review.
- Draft revision and rubric version travel with every save.
- Local recovery may protect interrupted typing but does not silently override a newer server revision.
- Concurrent devices or a manager reopen create a compare-and-resolve state.
- A rubric change pauses submission and shows added, removed, and changed criteria before migration.
- Failed saves preserve input and focus. Leaving with unsaved changes requires a focus-managed confirmation.
- Conflict declaration asks for only the policy-required reason, explains access consequences, and remains private to authorized managers.
- Declaring conflict and submitting a recommendation are mutually exclusive final states for one assignment revision.

## 9. Review and submit

- **Review recommendation** opens a real page state with every criterion, response, missing requirement, Work scope, rubric version, and visibility audience.
- Error summary receives focus and links to each invalid criterion.
- Final confirmation names Organization, Opportunity, Work/packet scope, and whether editing closes.
- Submission rechecks assignment ownership/state, deadline policy, rubric version, required criteria, conflict state, and draft revision.
- Idempotency prevents double-click, refresh, retry, or slow network from creating duplicate revisions.
- An ambiguous response shows **Checking review** rather than inviting immediate resubmission.
- Success produces a review receipt with submitted time, rubric version, scope, recommendation summary, and reopen policy. It does not expose internal IDs or other reviewers.

## 10. Accessibility and responsive behavior

- The queue and workspace are mobile-first because reviewers may work outside an office.
- Controls meet a 44px touch target; file and rubric controls have persistent labels.
- Wide screens may place Work evidence and rubric side by side with explicit minimum widths and one scroll owner per pane.
- At narrow widths, an explicit **Work / Review** switch preserves draft and reading position. Essential content is not hidden in a transient sheet.
- Keyboard users can move queue → assignment → Work/file → rubric → review summary → submit and return without focus loss.
- Dynamic save and upload/file states use polite live regions; blocking errors use alerts and associated field errors.
- 200% and 400% zoom preserve a linear reading order; resizable panes collapse before content becomes unusable.
- Media includes captions/transcripts or a named unavailable state where the Organization has not supplied an alternative.
- Reduced motion removes nonessential transitions.

## 11. Required fixtures

Every visual direction uses the same fixtures:

1. no assignments;
2. one new assignment;
3. assignments across several Organizations;
4. large queue with pagination;
5. due soon;
6. overdue but still open;
7. round closed;
8. assignment removed;
9. single-blind and double-blind projection;
10. identity-bearing answer withheld;
11. one Work and multiple Works;
12. PDF, image, audio/video, link, unavailable, and inaccessible file;
13. no rubric score, bounded rubric, structured criteria, and long notes;
14. required criterion missing;
15. score out of range;
16. draft saving, saved, offline, save failed, and concurrent change;
17. rubric changed after draft;
18. conflict declaration started, confirmed, failed, and already declared;
19. submitted recommendation;
20. reopened recommendation;
21. duplicate submit protected;
22. ambiguous submit result;
23. direct access to another reviewer’s assignment;
24. very long Work/Opportunity/Organization names and Unicode;
25. 320, 390, 768, 1280, and 1536 pixel viewports;
26. keyboard-only, screen-reader, reduced-motion, 200%, and 400% zoom behavior.

## 12. Direction candidates

### 01 — Focused assignment

Queue first, then one full-page assignment with Work reading above a clearly separated rubric. This is easiest to learn and strongest on phones, but repeated movement between long evidence and rubric can be tiring on wide screens.

### 02 — Evidence desk

A compact assignment rail, central Work reader, and persistent rubric pane keep evidence and response together. It handles multi-Work and long-rubric cases best on wide screens, while narrow screens deliberately switch between Work and Review. It must collapse before either pane becomes cramped.

### 03 — Review packet

The assignment becomes a structured packet with Works, answers, files, rubric responses, and review summary as sections. It is strongest for auditability and many evidence types but can feel administrative to an occasional reviewer.

Option 02, Evidence Desk, is selected locally after all three directions used the same fixtures and passed the responsive and interaction checks. Focused Assignment remains the narrow-screen reading-order reference; Review Packet remains the auditability reference. Product promotion remains blocked.

## 13. Premium comparison anatomy

| Job | Premium anatomy | Missa boundary |
| --- | --- | --- |
| Assignment queue | `data-table/data-table-04` wide; `list/list-03` narrow | Assigned records only; Organization, Opportunity, round, due state, Work count, progress, and one Open action |
| Focused shell | `resizable/resizable-01` wide; full-page linear fallback | Explicit minimums, one scroll owner per pane, no Organization administration |
| Work navigation | `tabs/tabs-11`, overflow from `tabs/tabs-14` | Stable Work destinations; not hidden carousel content |
| Evidence facts/files | `list/list-03`, `card/card-07` | Quiet Work reader, safe file metadata, accessible fallback; no provider/storage details |
| Rubric | `form/form-10`, `radio-group/radio-group-09`, `textarea/textarea-05`, `progress/progress-01` only for real completion | Versioned criteria, labelled scales, required state, associated errors; no star rating |
| Save/error/conflict | `alert/alert-17` through `alert/alert-20`, `dialog/dialog-06` | Durable states, compare/recover, conflict consequences, focus restoration |
| Review and submit | `list/list-03`, `separator/separator-01`, `dialog/dialog-06` | Review is a page state; dialog only confirms the final consequence |
| Narrow evidence detail | Full page; `sheet/sheet-04` only for bounded file facts/help | Long Work and rubric remain route history, not a transient sheet |
| Loading | `skeleton/skeleton-11` queue and Missa-owned pane geometry | Match queue, evidence, and rubric; no generic dashboard cards |

## 14. Product promotion gates

Promotion remains blocked until round review mode, due policy, rubric/version model, draft/revision/concurrency model, conflict lifecycle, removed/reopened assignment behavior, validated responses, file authorization/redaction, immutable/idempotent submission, customer-safe receipts, analytics, and end-to-end blind-mode, zoom, keyboard, screen-reader, failure, and retry QA exist and receive explicit approval. The canonical routes, assigned-only projection, mobile switch, foreign-ID 404, and focused automated accessibility check now exist locally.
