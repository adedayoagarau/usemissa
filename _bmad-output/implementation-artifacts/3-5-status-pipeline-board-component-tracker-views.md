---
epic: 3
story: 3.5
status: done
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

The initial implementation started with Pipeline; Addendum 3 closed Calendar,
Types, Organizations, and List, and Story 3.6 closes the Work view with a
private Library link and owner-scoped persistence.

**Addendum — re-verified after the globalThis singleton fix (see `bugfix-globalthis-singleton.md`):** the original verification above only exercised the `/api/users/:id/tracker` *route*, not the `/tracker` *page*. A cross-cutting bug (found later, while building Epic 6) meant a plain module-level singleton didn't reliably share state between Route Handlers and Page Server Components — so the page specifically was never actually confirmed to reflect a track/status change until the fix landed. Re-tested after the fix: `POST .../track` → `POST .../status` → `GET /tracker` (the page) now correctly shows the item in the Pipeline view with the right status. This story's `done`-adjacent claims are now fully page-level verified, not just API-level.

**Addendum 2 — calendar feed (FR25) wired in:** added `apps/web/app/api/users/[id]/calendar-token/route.ts` and `.../calendar.ics/route.ts` (mirroring `RadarServer`'s existing token-scoped feed pattern exactly — a calendar app subscribes to a URL and can't log in with a session cookie, so this uses `createFeedToken`/`verifyFeedToken`, not the session cookie), plus a `CalendarFeedButton` client component on the Tracker page ("Copy calendar feed link"). Verified: token issuance, a valid token returning real ICS content (`BEGIN:VCALENDAR`/`X-WR-CALNAME`/etc.), and an invalid token correctly 401ing. Also found and fixed a vocabulary leak while testing this: `X-WR-CALNAME` (the calendar's *display name* in Google/Apple/Outlook Calendar's UI — user-facing, unlike `PRODID` which calendar apps don't surface) read "Missa Radar Deadlines" — fixed to "Missa Deadlines" in `packages/radar-engine/src/tracker/calendarFeed.ts`, same class of leak as the `server/ui.ts` title/h1 fix from Story 1.2.

**Addendum 3 — remaining view modes closed out, status moved to `done`:** built `components/tracker-view-switcher.tsx` (shadcn `Tabs`) adding four of the five missing views client-side, re-grouping the same already-fetched `TrackerView` data (no new API calls): **Calendar** (deadline-sorted, pre-submission-only semantics kept from `view.deadlines`'s original intent but applied to all deadline-bearing items), **Types**, **Organizations**, **List**. Extracted the row rendering into a shared `TrackerItemRow` (used by every view, including the original `StatusPipelineBoard`, which Epic 7 still reuses for the org-facing Submissions inbox).

Along the way, found `TrackerItem` (the domain type itself, in `packages/radar-engine/src/tracker/tracker.ts`) was **missing a `type` field** — `organizationName` and `deadline` were present for the Organization/Deadline views but the opportunity's type (grant/magazine/contest/etc.) needed for the Types view wasn't. Added it (`type: opp.fields.type` in `toItem()`), a small additive change to a public exported interface — verified no existing test broke (all 44 `radar-engine` tests still pass) and added a new assertion confirming the field carries the real value through.

Work-based linking is completed in Story 3.6 now that Library ownership and
persistence are available; the Work tab groups linked and unassigned rows.

Verified in the running app: all five tab labels (Pipeline/Calendar/Types/Organizations/List) render on the Tracker page with a real tracked item.
