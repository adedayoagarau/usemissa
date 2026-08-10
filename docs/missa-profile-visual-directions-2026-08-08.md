---
title: Missa Profile visual directions
version: "1.0"
status: option-2-selected-and-promoted-locally
date: "2026-08-08"
screen_contract: ./missa-profile-screen-contract-2026-08-08.md
review_route: /design-system/profile-directions
selected_direction: option-2-profile-ledger
selected_review_route: /design-system/profile
product_promotion_status: implemented-local-not-deployed
---

# Missa Profile visual directions

These directions use the same Profile contract, private/public boundaries, section set, and fixtures. Option 2 has now been promoted locally to `/profile` and the public projection has been tightened so Tracker activity is never emitted. No production deployment is claimed.

## 01 — Focused sections

A quiet route-shaped rail keeps Overview, Identity, Preferences, Privacy, Integrations, Saved searches, Following, and Data independently understandable and saveable. The current section becomes a horizontally scrollable route index on narrow screens.

Strengths: clearest separation of public identity from private matching; best returning-user navigation; strongest scoped save and recovery behavior; easiest path to stable URLs. Risk: the section rail must not become a cramped dashboard or disappear behind an unlabeled mobile menu.

## 02 — Profile ledger — selected

An editorial identity ledger puts public/private boundaries above a horizontal section index.

Strengths: strongest reading experience and public/private explanation; calm and recognizably Missa. Risk: repeats identity context already present within Overview and Privacy, adds vertical distance, and horizontal navigation becomes crowded with eight destinations.

## 03 — Action index

A master-detail action index pairs section state with a focused editor.

Strengths: strongest task orientation and visible status. Risk: the framed two-panel treatment feels closer to Organization operations, adds card-like chrome, and is less natural as a creator Profile on mobile.

## Shared contract represented

- active, new, partial, multi-practice, preference-conflict, deprecated-term, private-identity, public-Work privacy-conflict, integration-attention, integration-unavailable, empty-collection, large-collection, mutation-failure, concurrent-change, and export-failure fixtures;
- one stable section job and save scope at a time;
- progressive practice search over private canonical selections without a flat 1,084-term picker;
- ordinary preference consequences instead of `include`, `prefer`, `exclude`, weights, or internal IDs;
- separate practice, opportunity type, geography, eligibility, fee, deadline, and submission behavior;
- explicit public/private preview that never exposes hidden identity or private field existence;
- customer-safe integration state without provider codes, queue names, confidence thresholds, sync timestamps, or freshness;
- unsaved identity protection, preserved failed edits, large-collection pagination, empty-state recovery, and owner-only export scope;
- local responsive runtime QA across 320, 390, 768, 1280, and 1536 pixels; keyboard section navigation, focus transfer, unsaved-change protection, field-error association, and automated WCAG A/AA checks across all eight selected sections;
- manual screen-reader, 200%/400% zoom, real APIs, authentication, and product-route integration remain promotion gates.

## Selected direction

Option 2, Profile Ledger, is the selected local Profile composition. It keeps the public/private identity boundary visible above the section index, then moves into one focused section at a time. Focused Sections remains the route-architecture reference, while Action Index remains a reference for Organization settings rather than the creator default.

The selection wins because it:

- turns the current long mixed card stack into a calm personal record with stable, ordinary Profile destinations;
- gives identity, preferences, privacy, integrations, collections, and data independent save and failure boundaries;
- keeps private matching and eligibility visibly separate from public identity;
- scales from a new creator to 64 practice preferences, 24 searches, and 40 followed Organizations;
- supports progressive taxonomy refinement and conflict resolution without exposing internal graph machinery;
- gives narrow screens a readable identity summary and reachable, horizontally scrollable section index rather than a squeezed desktop split view;
- uses premium component anatomy while remaining a Missa-owned composition.

The local product now has URL-backed sections, separate scoped mutations, progressive 12-facet refinement, exclusion-conflict protection, authenticated owner integration, and focused phone/desktop accessibility checks. Public image/link/Work publication contracts, eligibility self-description, calendar integration, legacy preference migration, large-collection pagination, wider tablet/zoom/manual assistive-technology QA, stable remote preview, and production approval remain open.

## Validation record

The selection was re-audited after the initial desktop-only review. Option 2 is now the default comparison state, direction controls expose `aria-pressed`, all compact controls meet the 44px minimum, failed biography saving is associated with the invalid field, and section navigation deliberately focuses the new heading.

- 15 fixtures × 3 directions × 5 widths = 225 responsive combinations with no page-level horizontal overflow;
- selected mobile flow verifies section focus and unsaved Identity preservation/discard behavior;
- mutation and taxonomy-conflict fixtures verify durable error/status behavior;
- automated WCAG A/AA scans pass for Overview, Identity, Preferences, Privacy, Integrations, Saved searches, Following, and Data.
