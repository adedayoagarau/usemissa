---
epic: 5
story: 5.3
status: review
title: Custom Lists
---

# Story 5.3: Custom Lists

Lists are a private organizing layer for tracked opportunities. They do not replace Tracker status, do not implicitly track an opportunity, and never leak into public or organization projections.

## Delivered

- `CustomList` and composite-key `CustomListMembership` domain records.
- Owner-scoped create, rename, archive, delete, list, membership add/remove, and opportunity projection operations.
- Case-insensitive per-user name uniqueness, bounded fields, idempotent membership changes, tracked-only membership validation, and archive/delete cleanup.
- Additive Neon persistence tables and JSON store persistence.
- Authenticated private no-store routes for list CRUD and membership CRUD/list projection.

## Contracts

- `GET/POST /api/me/lists`
- `PATCH/DELETE /api/me/lists/:id`
- `GET /api/me/lists/:id/opportunities`
- `POST/DELETE /api/me/lists/:id/opportunities/:opportunityId`

## Validation

- Engine: focused List tests cover owner isolation, uniqueness, idempotency, tracked-only membership, archive/delete cleanup, and JSON reload.
- Adapter: build and schema ensure pass; private List tables are present in Neon.
- Web: route surface is included in the production build.

## Follow-up UI slice

Add the `Add to List` popover to opportunity cards/detail and a List filter/management panel to Tracker without adding a new top-level navigation item. This is intentionally separated from the Library tabs.
