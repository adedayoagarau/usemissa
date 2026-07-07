---
epic: 3
story: 3.5
status: partial
---

# Story 3.5: Status Pipeline Board component + Tracker views

## Dev Agent Record

**Implementation:**
- `apps/web/components/status-pipeline-board.tsx` — the shared component per the UX spec's Component Strategy, grouped-by-stage (Planning/Submitted/In progress/Outcomes/Archived) with an inline `StatusSelect` per row. Written so Epic 7 can reuse the same grouped-card layout for the org-facing Submissions inbox (swap the per-row select for a bulk-action toolbar, per the UX spec).
- `apps/web/components/status-select.tsx` — client component using shadcn `Select`, backed by `apps/web/lib/statusLabels.ts` (the same `STATUS_LABELS` mapping — Drafting/Ready/In Review/etc., not raw slugs — already fixed in `radar-engine/src/server/ui.ts`, kept in sync deliberately).
- `apps/web/app/(passport)/tracker/page.tsx` — stats row + next-deadlines + the Pipeline view via `StatusPipelineBoard`.

**Verified (real runtime, full round trip):**
```
POST /api/users/user_0001/track {opportunityId: opp_0001} -> 201, myStatus: "saved"
POST /api/users/user_0001/status {opportunityId: opp_0001, status: "submitted"} -> 200,
  myStatus: "submitted", full event history recorded, expectedResponseBy computed
GET /api/users/user_0001/tracker -> pipeline.submitted contains the item with correct
  daysToDeadline, fit, and event history
```

**Deviation from AC — partial, not done:** the AC calls for **pipeline, deadline, work-based, type, organization, and list views**. Only the **Pipeline view** is implemented (the default, and the one with the richest existing engine support via `getTracker()`). Deadline/work-based/type/organization/list views are view-mode toggles over the same underlying `TrackerView` data (no new API needed) but weren't built in the time available this session — marking this story `partial`, not `done`, so it isn't lost track of. Recommended next step: add a view-mode tab switcher above the board that re-groups `view.pipeline`'s flattened items client-side by the other five dimensions, since the data already contains everything needed (organizationName, type, deadline are all present on `TrackerItem`).

**Addendum — re-verified after the globalThis singleton fix (see `bugfix-globalthis-singleton.md`):** the original verification above only exercised the `/api/users/:id/tracker` *route*, not the `/tracker` *page*. A cross-cutting bug (found later, while building Epic 6) meant a plain module-level singleton didn't reliably share state between Route Handlers and Page Server Components — so the page specifically was never actually confirmed to reflect a track/status change until the fix landed. Re-tested after the fix: `POST .../track` → `POST .../status` → `GET /tracker` (the page) now correctly shows the item in the Pipeline view with the right status. This story's `done`-adjacent claims are now fully page-level verified, not just API-level.
