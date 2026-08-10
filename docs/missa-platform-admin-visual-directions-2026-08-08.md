---
title: Missa Platform Admin visual directions
version: "1.0"
status: option-02-applied-local-admin-family
date: "2026-08-08"
screen_contract: ./missa-platform-admin-contract-2026-08-08.md
review_route: /design-system/admin-directions
selected_review_route: /design-system/admin
product_promotion_status: blocked
---

# Missa Platform Admin visual directions

These directions use the same Admin route model, operational objects, source/taxonomy boundaries, permission model, action contract, and fixtures. They do not change `/admin`, Admin APIs, data stores, worker behavior, customer/Organization projections, or production.

## 01 — Command ledger

A stable grouped rail and compact platform-state strip lead into a consequence-first ledger. Each attention row opens a full evidence route. It is the calmest hierarchy and the strongest audit reading order, but high-volume cross-reference requires more movement between list and detail.

## 02 — Evidence control room

The grouped rail surrounds a searchable worklist and persistent evidence inspector. The operator can compare reason, source maturity, related records, and recovery before requesting a bounded action. It best matches most Admin work; at narrow widths the selected item becomes a full detail state with explicit Back and focus restoration.

**Selected on 2026-08-08.** It gives frequent operators the strongest balance of queue speed, evidence continuity, bounded action safety, and narrow-screen list/detail clarity. Command Ledger remains the audit-reading reference; Domain Index remains the occasional-operator orientation reference.

## 03 — Domain index

Operate, Review, Serve, and Business appear as a compact route index above a focused domain surface. It gives occasional/read-only operators strong orientation and reduces the apparent length of Admin navigation. Its risk is that the index can compete with urgent attention work and become a second navigation system.

## Shared rules

- Control Room starts with consequence and evidence, not a wall of metrics;
- Operate, Review, Serve, and Business remain stable route groups;
- search, filter, sort, page, row selection, detail, and return state are URL-backed target behavior;
- maturity, source, observation time, grain, and unknown/unavailable state remain attached to the fact they qualify;
- freshness, confidence, worker state, trust, source health, internal IDs, and taxonomy graph details are allowed only because Admin operation/governance is the user’s job;
- no password, token, secret, private message body, unrestricted submission/file content, or raw provider payload is rendered;
- all 12 taxonomy facets remain independent; proposals expose canonical IDs, evidence, relations, mappings, scheme version, and impact without turning approval into publication;
- every mutation follows inspect, preview, confirm/request, acknowledge, and receipt with idempotency, version, audit, and recovery boundaries;
- requested, queued, accepted, applied, sent, delivered, and customer-visible are distinct states;
- read-only, missing capability, step-up, two-person approval, capability removal, session expiry, and forbidden direct URL are visible states rather than hidden controls;
- mobile uses route-shaped list/detail continuity, not squeezed tables, appended details, or essential Sheets;
- all three directions use the same fixtures before selection;
- product promotion remains blocked.

## Validation record

- 45 fixtures × 3 directions × 5 widths = 675 responsive combinations with no page-level horizontal overflow;
- Evidence Control Room verifies wide-screen worklist/inspector continuity and narrow-screen list → detail → focused return;
- bounded-action flow verifies exact one-item scope, expected state, reason, worker-acknowledgement boundary, and operator receipt;
- read-only and missing-capability states keep evidence available without exposing an actionable control;
- taxonomy fixtures keep canonical ID, Language facet, relation/mapping impact, affected records, and separate opportunity type, eligibility, career stage, geography, fee, and deadline boundaries visible;
- unavailable graph/store states remain different from empty queues and healthy zero;
- automated WCAG A/AA scans pass on the wide Control Room, narrow evidence detail, and expanded mobile Admin navigation;
- TypeScript, focused lint, and diff checks pass.

Option 02 is selected for the local design library at `/design-system/admin`. Manual screen-reader, 200%/400% zoom, high-contrast, real capability/auth projection, URL state, authenticated APIs, and product-route integration remain promotion gates.

## Local product application

- All 16 Platform Admin destinations now use the Operate, Review, Serve, and Business shell grouping.
- Taxonomy now belongs to the Platform Admin layout rather than the Organization route group.
- `/admin` now starts with the prioritized evidence worklist, followed by per-observation platform state; the duplicate destination-card directory was removed.
- `/admin/operations` persists search, queue, severity, and selected item in the URL. At narrow widths, selecting a row shows one evidence detail state, focuses its heading, and Back restores the originating row.
- The existing Admin regression traverses Control Room and domain routes at 375, 428, 768, 1280, and 1536 pixels with no page overflow. The focused phone flow also passes an automated WCAG A/AA scan and captures Control Room and evidence-detail screenshots.
- Broad `isAdmin` authorization, immediate compatibility actions, stable domain detail routes, idempotency, audit-as-success-boundary, and step-up/two-person approval remain explicit production blockers.
