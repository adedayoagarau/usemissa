---
title: Missa Tracker visual directions
version: "1.0"
status: selected-synthesis-implemented-locally
date: "2026-08-08"
parent_contract: ./missa-tracker-submissions-screen-contract-2026-08-08.md
review_route: /design-system/tracker-directions
component_selection_status: approved-local-composition
product_promotion_status: approved-and-implemented-locally-not-deployed
selected_review_route: /design-system/tracker
---

# Missa Tracker visual directions

Three local-only Tracker layouts apply the same status, taxonomy, truthfulness, and edge-state contract. Their selected synthesis is reviewed at `/design-system/tracker`; the comparison remains at `/design-system/tracker-directions`.

## Selected synthesis

- **Next Actions** is the default Active view and the narrow-screen foundation.
- **Stage Board** is an optional Active layout for high-volume creators. It becomes stage-labelled lists on narrow screens and never requires dragging.
- **Work Map** is the canonical Works view, preserving an explicit Unassigned group and historical Work/version boundaries.
- **Submissions** distinguishes hosted receipts from creator-recorded external records.
- **Calendar** keeps exact dates and undated/response items visible together rather than dropping rolling, unknown, or response states.

This selection now powers the local `/tracker` product route and canonical `/tracker/submissions/[submissionId]` receipt. The former `/my-submissions` routes are compatibility redirects. Other page families remain gated and no production deployment is claimed.

## Direction 01 — Next actions

An attention-led list with one real next-action area followed by calm, structured Tracker rows.

Best at:

- helping a returning creator resume quickly;
- narrow-screen reading and touch interaction;
- keeping deadline, Work, provenance, and one next action visible;
- large histories when combined with search, filters, and pagination.

Watch-outs:

- attention rules must remain sparse and explainable;
- items without an action should not be artificially promoted;
- dense histories still need compact row and bulk archive patterns.

## Direction 02 — Stage board

A desktop pipeline across Saved, Preparing, Submitted, In progress, and Outcome, with stage-labelled lists as the required mobile fallback.

Best at:

- high-volume users who think in process stages;
- comparing workload across stages;
- moving one record through an understandable lifecycle.

Watch-outs:

- horizontal board layout cannot be the only representation;
- drag is an optional accelerator, never the status mechanism;
- empty columns and long cards can waste space;
- the board must not expose every internal status at once.

## Direction 03 — Work map

A Work-centered layout that groups opportunities and submissions beneath private Library Works, preserving an Unassigned group.

Best at:

- writers and artists sending one body of work to several calls;
- withdrawal reasoning when the same Work receives an acceptance;
- connecting Tracker to Library without merging the two products;
- understanding mixed decisions across multiple submitted Works.

Watch-outs:

- creators who think opportunity-first may find it indirect;
- linking must preserve historical file/version snapshots;
- multi-Work submissions must not become duplicated records;
- Work taxonomy cannot be used as status or eligibility.

## Edge fixtures represented

- normal active Tracker;
- imported unmatched private row;
- conflicting status from two event sources;
- mixed per-Work decision;
- first-use empty state;
- large history fixture.

## Selected synthesis rationale

Direction 01 is the strongest default and mobile foundation. Direction 02 is a useful optional desktop view for stage-oriented users. Direction 03 is a high-value Work view rather than the global default.

The selected product shape is therefore a synthesis: Next Actions as default, Stage Board as an optional layout, and Work Map as the canonical Works view. Submissions and Calendar remain task-specific views rather than competing dashboard cards.

## Promotion gates

- selected synthesis represented in a dedicated local composition;
- canonical status mapping approved across Tracker, hosted submissions, and relational persistence;
- 320px, 390px, tablet, desktop, and 200% zoom verified;
- imported, conflict, mixed, empty, and large-history flows verified;
- status update pending/error/conflict behavior verified;
- no fit/trust/freshness/internal state rendered;
- component candidates evaluated by job after selection;
- explicit product-route promotion approval.
