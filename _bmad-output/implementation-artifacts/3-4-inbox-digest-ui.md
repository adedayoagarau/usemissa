---
epic: 3
story: 3.4
status: done
---

# Story 3.4: Inbox digest UI

## Dev Agent Record

**Implementation:** `apps/web/app/(passport)/inbox/page.tsx` + `apps/web/app/api/users/[id]/inbox/route.ts` — same sectioned shape as `RadarServer`'s existing `/api/users/:id/inbox` (new-for-you, closing-soon, opening-soon, recently-updated, from-followed-orgs, reminders, overdue, withdrawal-suggestions), reusing `buildInboxDigest` directly rather than reimplementing digest logic. Every alert card shows its `reason` field per the PRD's non-negotiable rule.

**Verified:** `GET /inbox` returns 200 for the logged-in demo user; digest sections render (empty sections correctly render nothing rather than an empty header, per the `Section` component's early return).
