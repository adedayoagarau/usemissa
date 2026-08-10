---
title: Missa opportunity detail visual directions
version: "1.0"
status: selected-synthesis-local
date: "2026-08-08"
parent_contract: ./missa-opportunities-screen-contract-2026-08-08.md
review_route: /design-system/opportunity-detail-directions
product_promotion_status: blocked
selected_review_route: /design-system/opportunity-detail
---

# Missa opportunity detail visual directions

This document compares three local-only detail layouts against the approved Opportunities contract. It does not select a premium component, authorize a product-route edit, or introduce new customer-facing data.

## Selected synthesis

The selected local composition is not one direction copied whole. It deliberately combines:

- **Decision Brief** for the desktop identity, source-provided image, title, Organization, summary, and initial Save/In Tracker action;
- **Evidence Ledger** for labelled deadline, fee, reach, status, eligibility, and preparation facts;
- **Guided Pursuit** for the mobile reading order: decide, prepare, understand the call, then finish on the official source.

The implementation review lives at `/design-system/opportunity-detail`. It includes complete, partial, conflicting, closed, no-image, broken-image, unavailable-source, merged-record, and long-content fixtures, plus signed-out, signed-in, saved, preparing, and submitted person states.

This selection authorizes local premium-reference adaptation only. It does not authorize changes to `/opportunities/[slug]` or production.

## The user's decision

The detail screen exists to help a creator decide whether to pursue one opportunity without losing the official source, misunderstanding eligibility, or preparing the wrong material.

A successful screen lets the person:

1. identify the call and Organization;
2. understand deadline, fee, reach, status, and eligibility;
3. see exact unknown or conflicting facts without a confidence score;
4. understand what to prepare;
5. save once into Tracker;
6. open the official guidelines;
7. return to the same browse state;
8. report a consequential problem.

The page does not promise eligibility, acceptance, source freshness, or an inferred fit score.

## People and contexts

- A signed-out visitor evaluating a public call.
- A signed-in creator with an incomplete Profile.
- A signed-in creator whose Profile and Library can support observable, private reasons.
- A returning creator whose opportunity is already in Tracker.
- A mobile user moving from a selected result into a focused detail surface.
- A creator reopening a closed or changed call.

## Data boundaries

### Customer-facing

- source-provided image when useful;
- opportunity type, title, and Organization;
- deadline, fee, reach, and public status;
- source-backed summary;
- eligibility and requirements;
- a curated subset of named practices;
- Save/In Tracker;
- official source and report-an-issue actions.

### Private and contextual

- observable Profile or Library intersections, only when available and explainable;
- preparation state after the opportunity enters Tracker.

### Never customer-facing

- source confidence;
- freshness, age, last check, or update prompts;
- ingestion/review state;
- numeric fit or trust scores;
- internal taxonomy IDs;
- fabricated imagery or inferred eligibility.

## Edge states represented in every direction

- complete source-backed record;
- partial record with fee or materials not listed;
- consequential fact conflict, such as two deadlines;
- closed call retained for reference;
- saved and unsaved Tracker state;
- long title and Organization content;
- optional image with a quiet fallback required before promotion;
- unknown eligibility or requirements;
- unavailable official source;
- signed-out action with safe return after authentication;
- issue-report success and failure;
- duplicate/merged and not-found records.

## Direction 01 — Decision brief

An editorial, image-led opening followed by a calm reading column and sticky decision rail.

Best at:

- preserving the emotional identity of a real call without turning the page into marketing;
- keeping decisive facts and the official source close while long guidance remains readable;
- matching the approved Curated Catalogue browse direction.

Watch-outs:

- the image must not outrank eligibility or requirements;
- the sticky rail must collapse into the reading order on mobile;
- very long rules need strong section landmarks.

## Direction 02 — Evidence ledger

A structured record with labelled fact rows, explicit exceptions, and a compact action rail.

Best at:

- calls with many rules, formats, limits, rights, prizes, or conflicting facts;
- scanning exact labels and values;
- making unknowns precise without exposing backend confidence.

Watch-outs:

- it can feel administrative for a simple call;
- repeated rows may create excessive reading on mobile;
- the visual hierarchy must distinguish decisive facts from supplementary call details.

## Direction 03 — Guided pursuit

A staged Decide, Prepare, Apply reading path with explicit chapter navigation.

Best at:

- first-time creators and narrow screens;
- explaining why Missa and the official source have different roles;
- keeping eligibility before preparation and preparation before submission.

Watch-outs:

- the stages must not imply completion or guaranteed progress;
- experienced users still need direct access to decisive facts;
- anchor navigation must preserve focus and announce context correctly.

## Comparison and selected synthesis rationale

Direction 01 best matches the selected desktop browse language. Direction 03 has the strongest narrow-screen reading order. Direction 02 is valuable as a reusable anatomy for complex call-specific facts, but its full administrative page treatment is unnecessary for simple calls. The selected composition therefore uses each direction only for the job it solves best.

Premium references are evaluated by job rather than imported as a page: media identity, labelled facts, durable alerts, one stateful Save/In Tracker action, source navigation, issue reporting, and responsive reading order.

## Promotion gates

- selected synthesis recorded and represented in a dedicated local composition;
- 320px, 390px, tablet, desktop, and 200% zoom verified;
- complete, partial, conflict, closed, no-image, and unavailable-source states verified;
- keyboard order, headings, landmarks, focus restoration, and external-link names verified;
- signed-out, saved, preparing, submitted, and archived action states specified;
- no freshness/confidence/internal review copy present;
- product-route promotion explicitly approved.
