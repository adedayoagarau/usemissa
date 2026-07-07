---
epic: 3
story: 3.2
status: done
---

# Story 3.2: Opportunities/Discover feed

## Dev Agent Record

**Implementation:**
- `apps/web/app/(passport)/opportunities/page.tsx` — server component, fetches directly from the in-process engine (no self-referential HTTP call).
- `apps/web/app/api/users/[id]/discover/route.ts` — same JSON shape as `RadarServer`'s existing `/api/users/:id/discover` (via the shared `lib/opportunityView.ts` helper), for any external/future consumer of the API surface.
- `apps/web/components/track-button.tsx` — client component, POSTs to `/api/users/[id]/track`, `router.refresh()`s on success.
- `apps/web/app/(passport)/layout.tsx` — new auth-gated shell with nav (Opportunities/Inbox/Tracker), created as shared groundwork for this and the other Epic 3 pages.

**Groundwork added ahead of schedule (needed to make this story demonstrable at all):**
- `apps/web/lib/engine.ts` — a demo-seeded (`buildServerDemoWorld`, same fixture the CLI's `serve --demo` uses), in-memory `RadarEngine` singleton for `apps/web`'s route handlers, replacing the placeholder empty-store singleton from Story 1.2. Explicitly **not** production wiring — real persistence is still an open item (see Story 1.2/1.4 notes).
- `apps/web/app/api/auth/login/route.ts` — a minimal login endpoint, built ahead of Story 2.1's real form because Epic 3 needed *something* to log in with to test against. Story 2.1 replaces `/login`'s placeholder content with a themed form calling this same endpoint.

**Verified (real runtime, full round trip, not a mock):**
```
POST /api/auth/login {email: ada@example.com, password: poetry-and-fiction} -> session cookie issued
GET /api/users/user_0001/discover -> 5 opportunities with real Fit Score reasons
  ("Accepts poetry, fiction", "No fee", "Deadline in 6 days", "Allows simultaneous submissions")
GET /opportunities -> 200, page renders "Open opportunities", Track buttons, Strong/Possible Fit badges
```

**Not done:** RadarProfile (saved search) creation UI is Story 3.3, not started.
