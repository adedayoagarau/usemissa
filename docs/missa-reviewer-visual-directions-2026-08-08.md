# Missa reviewer visual directions

---
title: Missa reviewer visual directions
version: "1.0"
status: option-2-bounded-local-product-routes
date: "2026-08-08"
screen_contract: ./missa-reviewer-journey-contract-2026-08-08.md
review_route: /design-system/reviewer-directions
selected_direction: option-2-evidence-desk
selected_review_route: /design-system/reviewer
product_promotion_status: blocked
---

# Missa reviewer visual directions

## 01 — Focused assignment

The reviewer sees a calm queue and opens one assignment as a full page. Work evidence precedes the rubric in a single reading order. It is the easiest direction to learn and the strongest phone baseline, but long evidence makes repeated cross-reference slower on wide screens.

## 02 — Evidence desk — selected

An assignment rail, Work reader, and rubric pane keep evidence and response together. It offers the strongest wide-screen cross-reference and multi-Work handling. Below the pane minimum, it becomes an explicit Work/Review switch with preserved state rather than squeezed columns.

## 03 — Review packet

Works, answers, files, rubric responses, and final review become a structured packet. It offers the strongest audit trail and mixed-evidence organization, but its dossier character can feel more administrative than a guest reviewer needs.

## Shared rules

- reviewer sees assigned work only;
- blind identity is removed by the server projection, not visually concealed;
- one quiet white canvas with Aubergine action, Lichen success, Ochre attention, Mineral Blue guidance, and red only for blocking/conflict state;
- no Organization admin shell, other reviewers, source freshness, confidence, provider, queue-worker, storage, or internal-ID detail;
- Work/category context never becomes a fit score or recommendation;
- rubric uses labelled criteria and scales, never stars or an unexplained generic 1–10 input;
- draft, submitted, conflict, removed, reopened, and ambiguous-result states remain distinct;
- review summary is a page state and final submission is deliberately confirmed;
- mobile keeps Work and Review reachable without a side-by-side squeeze or hidden essential sheet;
- all three directions use the same fixtures before selection;
- product promotion remains blocked.

## Selected direction

Option 2, Evidence Desk, is the selected local reviewer composition. It wins because the reviewer’s central job is cross-referencing permitted evidence against a versioned rubric: on wide screens, the assignment rail, Work reader, and rubric stay visible with independent, bounded scroll areas; on narrow screens, the same state becomes an explicit Work/Review switch rather than compressed columns or a hidden essential sheet.

Focused Assignment remains the mobile linear-order reference, and Review Packet remains useful when audit-heavy evidence needs a dossier structure. Neither replaces the selected workspace.

## Validation record

- 31 fixtures × 3 directions × 5 widths = 465 responsive combinations with no page-level horizontal overflow;
- selected mobile flow verifies Work/Review switching, final recommendation review, focus transfer, deliberate confirmation, and one received status;
- blind-review, withheld-answer, required-criterion, score-range, conflict, unavailable-file, inaccessible-file, removed, closed, submitted, reopened, ambiguous-result, and save-recovery states remain distinguishable;
- automated WCAG A/AA scans pass on the selected wide Evidence Desk and narrow Review pane;
- TypeScript, focused lint, and diff checks pass.
- Canonical `/reviews` and `/reviews/[assignmentId]` now implement the selected queue and Evidence Desk locally with an assigned-only server projection.
- Three focused product-route tests pass: mobile Work/Review composition with WCAG A/AA scan and no overflow, read-only legacy recommendation, and foreign-assignment 404 without content leakage.
- The unsafe generic numeric review form is absent from the canonical product route; no rubric or submit control is simulated.

Manual screen-reader, 200%/400% zoom, short-lived file authorization, real blind policy, rubric, draft concurrency, idempotent submission, and wider product-route QA remain promotion gates.
