---
epic: 3
story: 3.6
status: done
---

# Story 3.6: Following management UI

## Dev Agent Record

**Implementation:**
- `apps/web/app/api/users/[id]/following/route.ts` (GET list with org names joined in, POST follow — POST mirrors `RadarServer`'s existing follow route).
- `apps/web/app/api/users/[id]/following/[organizationId]/route.ts` (DELETE unfollow) — `@missa/radar-engine` has `followOrganization()` but no unfollow; `follows` is a plain array on `RadarStore` (not keyed by id), so this filters it directly, the same "manipulate the store where the engine has no dedicated method" pattern already used for RadarProfile PATCH/DELETE in Story 3.3.
- `apps/web/components/following-list.tsx` (list + unfollow) and `apps/web/components/follow-button.tsx` (inline "Follow organization" link next to each opportunity's org name on the Opportunities page, hidden once already followed) — added the follow-button too since the AC's "manage" implies there needs to be a way to follow in the first place, not just unfollow.

**Verified (real runtime, full round trip):**
```
POST /api/users/user_0001/following {organizationId: org_0001} -> 201
GET /api/users/user_0001/following -> [{organizationId, organizationName: "North River Review", followedAt}]
GET /opportunities (page) -> "North River Review" and "Unfollow" both visible in the Following section
DELETE /api/users/user_0001/following/org_0001 -> {ok: true, removed: true}
GET /api/users/user_0001/following -> [] (confirmed empty after unfollow)
```
