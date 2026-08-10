---
title: Missa Organization submissions, reviews, and decisions visual directions
version: "1.0"
status: approved-local-responsive-family
date: "2026-08-08"
screen_contract: ./missa-organization-submissions-reviews-decisions-contract-2026-08-08.md
review_route: /design-system/organization-workflow-directions
selected_review_route: /design-system/organization-workflow
selected_direction: Queue and Dossier for intake; Evidence Desk for reviews and decisions; Lifecycle Ledger contextual for high-volume comparison
product_promotion_status: selected-read-only-family-local-only-mutations-blocked
---

# Missa Organization submissions, reviews, and decisions visual directions

The three local directions use the same Organization, capability projections, lifecycle lanes, taxonomy boundary, Submission/Work records, review assignments, per-Work decisions, communication states, and adversarial fixtures. They compare structure—not colors or decorative variants.

The selected family now supplies the local `/organization/[organizationId]/submissions`, Submission dossier, Reviews, and Decisions compositions. It does not change production, compatibility APIs, reviewer assignments, decisions, messages, or delivery mutations. Premium Shadcn Studio components provide reviewed anatomy while server capability and lifecycle evidence remain authoritative.

## 01 — Queue and dossier

A consequence-first Submission queue sits beside one selected dossier. Receipt, review, decision, and optional payment remain independent row columns. The dossier keeps Work, material availability, category context, and the next safe action visible.

Strengths:

- fastest triage from attention to one coherent record;
- preserves inventory position while reviewing a Submission;
- supports explicit cross-page selection and bulk-assignment preview;
- keeps packet summary and individual Works visibly different;
- mobile becomes labelled Submission rows followed by a focused dossier.

Risks:

- the dossier competes for width at ordinary laptop sizes;
- deep review and decision work still needs a dedicated full page;
- row density must remain role-aware so Finance and Viewer projections do not inherit empty columns.

## 02 — Lifecycle ledger

A wide ledger prioritizes cross-record comparison. The selected dossier moves below the inventory rather than narrowing the table. This direction makes independent lifecycle lanes easiest to compare at high volume.

Strengths:

- strongest scan across receipt, review, decision, communication, and payment;
- best accommodation for large Organizations, long Opportunity names, and sortable columns;
- most compatible with server pagination and optional virtualization;
- least likely to collapse distinct states into one generic status badge.

Risks:

- the selected record is farther from the originating row;
- mobile naturally stops being a ledger and becomes labelled records;
- attention ordering and saved views must prevent users from treating column scanning as the only workflow.

## 03 — Evidence desk

A selected Work and its permitted evidence remain beside the review rubric or decision controls. On wide screens this is the strongest reviewer/decision-maker composition; narrow screens use an explicit Work/review sequence rather than two compressed panes.

Strengths:

- strongest reading and judgment context;
- keeps blind identity, material, rubric version, draft state, and conflict action together;
- makes each Work the explicit unit of decision;
- supports deliberate outcome choices and a separate consequence summary before finalization.

Risks:

- poor as the default high-volume Submission inventory;
- resizable behavior can become an accessibility and mobile liability unless minimum sizes and a linear fallback are guaranteed;
- persistent evidence and controls require careful independent scroll ownership.

## Shared contract demonstrated

- Customer language uses Organization, Opportunity, Submission, Work, Review, Decision, Message, and Delivery.
- Receipt, review, per-Work decision, packet summary, communication, delivery, and payment remain independent.
- One packet with two Works demonstrates partial acceptance and mixed decisions.
- Decision choice updates a draft; it does not finalize or send immediately.
- Finalization is disabled while one Work has no decision or required review is incomplete.
- Confirmation names affected Works, derived delivery consequence, and the fact that no message will be sent.
- Blind review withholds submitter identity from both visible and accessible content.
- A failed review save preserves the recommendation and notes.
- Taxonomy is compact context and never a quality, eligibility, or decision score.
- Finance sees a payment-oriented projection with identity withheld; Legal sees agreement/copy consequences without outcome controls; Viewer is read only; foreign access reveals no record.
- Imported terminal packet status without Work decisions is treated as an integrity issue and blocks downstream trust.
- Bulk selection states the selected count and current-page scope before assignment/export preview.
- Message partial failure preserves successes and retries only the failed recipients.

## Local fixture set

The comparison includes:

- mixed, empty, 10,000-record, missing-file, payment-dispute, withdrawn-Work, taxonomy-conflict, and import-integrity queues;
- blind review, duplicate assignment, reviewer conflict, save failure, overdue review, and split recommendations;
- partially accepted and mixed packets, incomplete-review and concurrent-decision gates;
- partly sent, missing-recipient, scheduled-message, legal, Finance, Viewer, foreign-access, and urgent-correction states;
- 320px, 390px, tablet, desktop, and wide desktop behavior.

The screen contract carries the larger 27-group fixture matrix; the local selectors represent each high-risk class without pretending fixture data proves backend behavior.

## Runtime QA evidence

- The local route returned HTTP 200.
- All 156 combinations of three directions, 26 named fixtures, and 320px/1280px widths rendered one H1, one main landmark, no page overflow, no unnamed buttons, and no forbidden customer language.
- Separate passes at 390px, 768px, and 1536px retained one H1 and no horizontal page overflow.
- Submission, blind-review, and decision surfaces had no sub-44px interactive targets inside `main` at 390px.
- The accessibility tree exposed labelled search/select controls, real tables with captions and headers, named Organization navigation, a skip link, and labelled icon actions.
- Blind review removed the submitter name and rendered “Identity withheld.”
- Failed review save retained the entered note and announced recovery in a polite status region.
- `Review and finalize` was disabled with one undecided Work, enabled after an explicit second Work outcome, and opened a named confirmation.
- Escape closed the confirmation and returned focus to `Review and finalize` after the close transition.
- Browser runtime logs contained no warnings or errors.
- Targeted ESLint, TypeScript, and `git diff --check` are required again after documentation updates.

## Selected responsive family

No single direction is forced across this entire family:

- **Queue and dossier** is the default Submission inventory composition.
- **Evidence desk** is the reviewer and per-Work decision composition.
- **Lifecycle ledger** is contextual high-volume/column-comparison anatomy when an Organization genuinely needs it; it is not a second default navigation mode.

This is the approved local responsive family. The read-only local product projection is implemented. Mutation promotion remains blocked on the gates in the screen contract, especially typed capability projections, import repair, blind server projections, review validation, assignment uniqueness/conflict, draft/final decisions, concurrency, and recipient-level communication state.
