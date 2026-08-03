---
epic: 5
story: 5.2
status: review
title: Opportunity Preparation Checklist
---

# Story 5.2: Opportunity Preparation Checklist

The creator's preparation state is private and separate from Radar's canonical opportunity and Tracker status. Tracking an opportunity snapshots its extracted `requiredMaterials` exactly once. A deliberate refresh reconciles changed requirements while preserving completed work and retaining removed source rows as `not-applicable`.

## Delivered

- `OpportunityChecklist` and `ChecklistItem` domain records with honest source confidence (`high`, `possible`, `unknown`).
- Owner-scoped engine read/create, refresh, add, update, and delete operations with Library ownership checks.
- Eager checklist creation when an authenticated user tracks an opportunity; lazy read/create remains idempotent.
- Additive Neon persistence tables and JSON store persistence.
- Authenticated no-store routes for read, refresh, add, update, and delete.
- Opportunity detail Prepare panel with progress, keyboard-accessible toggles, add requirement, refresh, deliberate `Not applicable`, Library attachment picker, and submission boundary language.

## Contracts

- `GET/POST /api/me/opportunities/:id/checklist` (read/create and explicit refresh)
- `POST /api/me/opportunities/:id/checklist/items`
- `PATCH/DELETE /api/me/checklist-items/:id`

The session determines the owner. A complete item is only the creator's readiness marker; it never claims acceptance, delivery, or organization validation.

## Validation

- Engine: 81/81 tests, including tracking idempotency, refresh reconciliation, owner isolation, Library references, and honest unknown requirements.
- Adapters: build and non-destructive schema ensure pass; Neon schema was applied idempotently.
- Web: typecheck, production build, and lint pass with only two pre-existing warnings in the opportunities API.

## Follow-up release polish

Replace the temporary inline add prompt with a design-system dialog and thread idempotency/audit keys through mutation routes before declaring the story fully done.
