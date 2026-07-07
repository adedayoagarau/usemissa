---
epic: 3
story: 3.3
status: done
---

# Story 3.3: RadarProfile (saved search) creation/edit UI

## Dev Agent Record

**Implementation:**
- `apps/web/app/api/users/[id]/profiles/route.ts` (GET/POST) — GET mirrors `RadarServer`'s existing profiles route exactly; POST wraps `RadarEngine.createRadarProfile`.
- `apps/web/app/api/users/[id]/profiles/[profileId]/route.ts` (PATCH/DELETE) — new; `@missa/radar-engine` never had update/delete for profiles (only the CLI-era `RadarServer` had GET/POST). Rather than extend the core engine's tested public surface for two straightforward CRUD ops, this reads/writes `RadarStore.radarProfiles` directly — the same pattern `RadarServer`'s own GET route already uses, not a new precedent.
- `apps/web/components/saved-searches.tsx` — create form (genres, no-fee-only, deadline-within-days) + list with per-profile delete, wired into the Opportunities page above the feed.

**Verified (real runtime, full round trip):**
```
POST /api/users/user_0001/profiles {name, criteria: {genres, noFeeOnly, deadlineWithinDays}} -> 201
GET /api/users/user_0001/profiles -> both the seeded demo profile and the new one listed
GET /opportunities (page) -> "Poetry, no fee" visible in the Saved searches section
PATCH .../profiles/:id {name: "Poetry only"} -> 200, renamed
DELETE .../profiles/:id -> 200, confirmed gone from the list afterward
```
